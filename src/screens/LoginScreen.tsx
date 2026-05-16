import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { appConfig, buildApiBaseUrl } from '../config/schools';
import { useResponsiveFrame } from '../hooks/useResponsiveFrame';
import { useAuth } from '../state/AuthContext';
import { AppIcon } from '../ui/Icon';
import { colors, shadow } from '../ui/theme';

const authColors = {
  primary: '#473CD2',
  primaryDark: '#352BB3',
  primaryLight: '#6C63FF',
  primarySoft: '#EEF2FF',
  accent: '#FBBF24',
};

const startCooldownSeconds = (failCount: number) => Math.min(30, Math.pow(2, Math.max(1, failCount - 1)));
const GOOGLE_LOGIN_TIMEOUT_MS = 180000;

const isGoogleCallbackUrl = (url: string) => url.startsWith(appConfig.googleRedirectUri);

const parseGoogleCallback = (callbackUrl: string) => {
  const parsed = new URL(callbackUrl);
  const googleStatus = parsed.searchParams.get('google') || '';
  const googleError = parsed.searchParams.get('google_error') || '';
  const ticket = parsed.searchParams.get('ticket') || '';

  if (googleStatus && googleStatus !== 'success') {
    throw new Error(googleError || 'Login Google belum berhasil.');
  }
  if (!ticket) {
    throw new Error(googleError || 'Sesi login Google tidak lengkap.');
  }

  return ticket;
};

export function LoginScreen() {
  const { api, school, login, loginWithGoogleTicket, clearSchool, loading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [info, setInfo] = useState('Gunakan Email/NIS dan password sesuai akun web.');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const frameStyle = useResponsiveFrame(520);

  const schoolBaseUrl = useMemo(() => (school ? buildApiBaseUrl(school) || school.slug : '-'), [school]);
  const isOnCooldown = cooldownEnd > Date.now();
  const canSubmit = Boolean(identifier.trim() && password && !loading && !isOnCooldown);

  useEffect(() => {
    if (cooldownEnd <= 0) return undefined;

    const tick = () => {
      const left = Math.max(0, Math.ceil((cooldownEnd - Date.now()) / 1000));
      setCooldownLeft(left);
      if (left <= 0 && cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
        setCooldownEnd(0);
      }
    };

    tick();
    cooldownTimerRef.current = setInterval(tick, 500);

    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
      }
    };
  }, [cooldownEnd]);

  const beginCooldown = (nextFailCount: number) => {
    if (nextFailCount < 2) return;
    const seconds = startCooldownSeconds(nextFailCount);
    setCooldownEnd(Date.now() + seconds * 1000);
    setCooldownLeft(seconds);
  };

  const submit = async () => {
    setLocalError('');
    clearError();

    if (isOnCooldown) {
      setLocalError(`Terlalu banyak percobaan. Tunggu ${cooldownLeft} detik.`);
      return;
    }

    if (!identifier.trim() || !password) {
      setLocalError('Email/NIS dan password harus diisi.');
      return;
    }

    try {
      setInfo('Memverifikasi akun sekolah...');
      await login(identifier, password);
      setFailCount(0);
      setCooldownEnd(0);
      setInfo('Login berhasil. Menyiapkan dashboard...');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Terjadi kesalahan saat login. Silakan coba lagi.';
      const nextFailCount = failCount + 1;
      setFailCount(nextFailCount);
      beginCooldown(nextFailCount);
      setInfo('Gunakan Email/NIS dan password sesuai akun web.');
      setLocalError(
        message.toLowerCase().includes('password salah') || message.toLowerCase().includes('login')
          ? `Email/NIS atau password salah${nextFailCount >= 2 ? `. Tunggu ${startCooldownSeconds(nextFailCount)} detik sebelum coba lagi.` : '.'}`
          : message,
      );
    }
  };

  const waitForGoogleCallback = async (authUrl: string) =>
    new Promise<string>((resolve, reject) => {
      let settled = false;
      let subscription: { remove: () => void } | null = null;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => {
        if (subscription) subscription.remove();
        if (timeout) clearTimeout(timeout);
      };
      const finish = (callback: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        callback();
      };
      timeout = setTimeout(() => {
        finish(() => reject(new Error('Login Google melewati batas waktu. Silakan coba lagi.')));
      }, GOOGLE_LOGIN_TIMEOUT_MS);

      subscription = Linking.addEventListener('url', ({ url }) => {
        if (isGoogleCallbackUrl(url)) {
          finish(() => resolve(url));
        }
      });

      Linking.openURL(authUrl).catch((err) => {
        finish(() => reject(err instanceof Error ? err : new Error('Browser tidak bisa membuka login Google.')));
      });
    });

  const submitGoogle = async () => {
    if (!api) {
      setLocalError('Sekolah belum dipilih.');
      return;
    }

    setGoogleLoading(true);
    setLocalError('');
    clearError();
    try {
      setInfo('Membuka login Google...');
      const authUrl = api.googleMobileRedirectUrl(appConfig.googleRedirectUri);
      const callbackUrl = await waitForGoogleCallback(authUrl);
      const ticket = parseGoogleCallback(callbackUrl);
      setInfo('Memverifikasi login Google...');
      await loginWithGoogleTicket(ticket);
      setInfo('Login Google berhasil. Menyiapkan dashboard...');
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'Login Google gagal diproses.';
      setInfo('Gunakan Email/NIS dan password sesuai akun web.');
      setLocalError(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const displayedError = localError || error;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[frameStyle, styles.frame]}>
          <View style={styles.brandPanel}>
            <View style={styles.logoWrap}>
              {school?.logoUrl ? (
                <Image source={{ uri: school.logoUrl }} style={styles.logoImage} />
              ) : (
                <AppIcon name="school" size={34} color="#fff" />
              )}
            </View>
            <Text style={styles.schoolName} numberOfLines={2}>{school?.name || 'Sekolah'}</Text>
            <Text style={styles.systemName}>Sistem Informasi Sekolah & Presensi</Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <AppIcon name="check" size={15} color={authColors.accent} />
                <Text style={styles.featureText}>Presensi, tugas, dan quiz mobile</Text>
              </View>
              <View style={styles.featureRow}>
                <AppIcon name="shield" size={15} color={authColors.accent} />
                <Text style={styles.featureText}>Sesi aman sesuai subdomain sekolah</Text>
              </View>
              <View style={styles.featureRow}>
                <AppIcon name="globe" size={15} color={authColors.accent} />
                <Text style={styles.featureText} numberOfLines={1}>{schoolBaseUrl}</Text>
              </View>
            </View>
          </View>

          <View style={styles.formPanel}>
            <View style={styles.formHeader}>
              <Text style={styles.title}>Masuk Akun</Text>
              <Text style={styles.subtitle}>Login sama seperti web. Admin, guru, dan siswa memakai akun sekolah yang dipilih.</Text>
            </View>

            {info && !displayedError ? (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>{info}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <View style={styles.inputField}>
                <AppIcon name="user" size={19} color={colors.muted} />
                <TextInput
                  value={identifier}
                  onChangeText={(value) => {
                    setIdentifier(value.trim());
                    setLocalError('');
                    clearError();
                  }}
                  placeholder="Email / NIS"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="username"
                  style={styles.input}
                  placeholderTextColor="#8A96A8"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputField}>
                <AppIcon name="lock" size={19} color={colors.muted} />
                <TextInput
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    setLocalError('');
                    clearError();
                  }}
                  placeholder="Password"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  style={styles.input}
                  placeholderTextColor="#8A96A8"
                  returnKeyType="go"
                  onSubmitEditing={() => {
                    if (canSubmit) void submit();
                  }}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  onPress={() => setShowPassword((value) => !value)}
                  style={styles.eyeButton}
                >
                  <AppIcon name={showPassword ? 'eyeOff' : 'eye'} size={19} color={authColors.primary} />
                </Pressable>
              </View>
            </View>

            {displayedError ? <Text style={styles.error}>{displayedError}</Text> : null}
            {isOnCooldown ? <Text style={styles.cooldown}>Coba lagi dalam {cooldownLeft} detik.</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.submitButton, (!canSubmit || pressed) && styles.pressed]}
              onPress={() => void submit()}
              disabled={!canSubmit}
            >
              {loading && !googleLoading ? <ActivityIndicator color="#fff" /> : <AppIcon name="login" size={18} color="#fff" />}
              <Text style={styles.submitText}>{loading && !googleLoading ? 'Memproses...' : 'Masuk'}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>atau</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [styles.googleButton, (googleLoading || loading || pressed) && styles.pressed]}
              onPress={() => void submitGoogle()}
              disabled={googleLoading || loading}
            >
              {googleLoading ? <ActivityIndicator color={authColors.primary} /> : <Text style={styles.googleMark}>G</Text>}
              <Text style={styles.googleText}>{googleLoading ? 'Membuka Google...' : 'Masuk dengan Google'}</Text>
            </Pressable>

            <View style={styles.actionRow}>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={() => void clearSchool()}
                disabled={loading || googleLoading}
              >
                <Text style={styles.secondaryText}>Ganti Sekolah</Text>
              </Pressable>
              <View style={styles.helpBox}>
                <Text style={styles.helpText}>Lupa password? Hubungi admin sekolah.</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flexGrow: 1,
    paddingVertical: 48,
    paddingTop: 48,
    paddingBottom: 30,
    justifyContent: 'center',
  },
  frame: {
    gap: 14,
  },
  brandPanel: {
    borderRadius: 20,
    backgroundColor: authColors.primary,
    padding: 22,
    alignItems: 'center',
    gap: 9,
    ...shadow,
  },
  logoWrap: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 74,
    height: 74,
    borderRadius: 17,
  },
  schoolName: {
    color: '#fff',
    fontSize: 21,
    fontWeight: '900',
    textAlign: 'center',
  },
  systemName: {
    color: '#EDEBFF',
    fontWeight: '700',
    textAlign: 'center',
  },
  featureList: {
    alignSelf: 'stretch',
    marginTop: 8,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.24)',
  },
  featureText: {
    color: '#F8FAFC',
    flex: 1,
    fontWeight: '700',
    fontSize: 12,
  },
  formPanel: {
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    gap: 13,
  },
  formHeader: {
    gap: 4,
  },
  title: {
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: '600',
  },
  infoBox: {
    borderRadius: 8,
    backgroundColor: authColors.primarySoft,
    padding: 10,
  },
  infoText: {
    color: authColors.primaryDark,
    lineHeight: 18,
    fontWeight: '800',
  },
  inputGroup: {
    gap: 10,
  },
  inputField: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  eyeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: '800',
  },
  cooldown: {
    color: '#92400E',
    fontWeight: '800',
  },
  submitButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  submitText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 15,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#E2E8F0',
    flex: 1,
  },
  dividerText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  googleButton: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  googleMark: {
    color: '#DB4437',
    fontSize: 17,
    fontWeight: '900',
  },
  googleText: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 15,
  },
  actionRow: {
    gap: 9,
  },
  secondaryButton: {
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    color: authColors.primaryDark,
    fontWeight: '900',
  },
  helpBox: {
    alignItems: 'center',
  },
  helpText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
