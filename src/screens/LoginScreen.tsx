import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { buildApiBaseUrl } from '../config/schools';
import { useAuth } from '../state/AuthContext';
import { Button } from '../ui/Button';
import { AppIcon } from '../ui/Icon';
import { colors } from '../ui/theme';

export function LoginScreen() {
  const { school, login, clearSchool, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const submit = async () => {
    setLocalError('');
    if (!email.trim() || !password) {
      setLocalError('Email/NIS dan password wajib diisi.');
      return;
    }
    try {
      await login(email, password);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Login gagal.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.schoolCard}>
          <View style={styles.schoolIcon}>
            <AppIcon name="school" size={24} color={colors.primary} />
          </View>
          <View style={styles.schoolText}>
            <Text style={styles.schoolName}>{school?.name || 'Sekolah'}</Text>
            <Text style={styles.schoolUrl} numberOfLines={1}>
              {school ? buildApiBaseUrl(school) || school.slug : '-'}
            </Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Masuk Akun</Text>
          <Text style={styles.subtitle}>Gunakan akun admin, guru, atau siswa pada sekolah yang dipilih.</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email atau NIS</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="email@sekolah.id / NIS"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor="#8A96A8"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.input}
              placeholderTextColor="#8A96A8"
            />
          </View>

          {localError || error ? <Text style={styles.error}>{localError || error}</Text> : null}

          <Button label="Login" onPress={() => void submit()} loading={loading} />
          <Button label="Ganti Sekolah" onPress={() => void clearSchool()} variant="secondary" />
          {loading ? <ActivityIndicator color={colors.primary} /> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    gap: 16,
  },
  schoolCard: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  schoolIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#E7F4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolText: {
    flex: 1,
    minWidth: 0,
  },
  schoolName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  schoolUrl: {
    color: colors.muted,
    marginTop: 3,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 20,
  },
  field: {
    gap: 7,
  },
  label: {
    color: colors.slate,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    color: colors.text,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    lineHeight: 20,
    fontWeight: '700',
  },
});
