import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildApiBaseUrl } from '../config/schools';
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

export function LoginScreen() {
  const { school, login, clearSchool, loading, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [info, setInfo] = useState('Gunakan Email/NIS dan password sesuai akun web.');
  const [showPassword, setShowPassword] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const displayedError = localError || error;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
            {loading ? <ActivityIndicator color="#fff" /> : <AppIcon name="login" size={18} color="#fff" />}
            <Text style={styles.submitText}>{loading ? 'Memproses...' : 'Masuk'}</Text>
          </Pressable>

          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              onPress={() => void clearSchool()}
              disabled={loading}
            >
              <Text style={styles.secondaryText}>Ganti Sekolah</Text>
            </Pressable>
            <View style={styles.helpBox}>
              <Text style={styles.helpText}>Lupa password? Hubungi admin sekolah.</Text>
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
    padding: 18,
    paddingTop: 48,
    paddingBottom: 30,
    justifyContent: 'center',
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
