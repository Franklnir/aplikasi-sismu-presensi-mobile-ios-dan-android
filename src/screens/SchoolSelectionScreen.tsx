import React, { useEffect, useState } from 'react';
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
import { searchSchools } from '../api/schoolDirectory';
import { appConfig } from '../config/schools';
import { useAuth } from '../state/AuthContext';
import type { School } from '../types';
import { AppIcon } from '../ui/Icon';
import { colors } from '../ui/theme';

export function SchoolSelectionScreen() {
  const { selectSchool, loading } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      try {
        const schools = await searchSchools(query);
        if (!cancelled) setResults(schools);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <AppIcon name="school" size={32} color={colors.primary} />
          </View>
          <Text style={styles.title}>Pilih Sekolah</Text>
          <Text style={styles.subtitle}>Cari nama sekolah atau subdomain sekolah yang sudah terdaftar.</Text>
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="school" size={19} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Contoh: SMA Bali"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor="#8A96A8"
          />
          {searching ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {!appConfig.apiBaseUrl && !appConfig.rootDomain && !appConfig.schoolDirectoryUrl ? (
          <Text style={styles.warning}>
            Konfigurasi API belum diisi. Set EXPO_PUBLIC_API_BASE_URL atau EXPO_PUBLIC_ROOT_DOMAIN sebelum build produksi.
          </Text>
        ) : null}

        <View style={styles.results}>
          {results.map((school) => (
            <Pressable
              key={`${school.slug}-${school.apiBaseUrl || school.host || ''}`}
              style={({ pressed }) => [styles.schoolRow, pressed && styles.pressed]}
              onPress={() => void selectSchool(school)}
              disabled={loading}
            >
              {school.logoUrl ? (
                <Image source={{ uri: school.logoUrl }} style={styles.schoolLogo} />
              ) : (
                <View style={styles.schoolLogoFallback}>
                  <AppIcon name="school" size={20} color={colors.primary} />
                </View>
              )}
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName}>{school.name}</Text>
                <Text style={styles.schoolSlug}>{school.slug}</Text>
              </View>
              <Text style={styles.pickText}>Pilih</Text>
            </Pressable>
          ))}
        </View>

        {query.trim().length >= 2 && !searching && results.length === 0 ? (
          <Text style={styles.empty}>Sekolah tidak ditemukan. Pastikan subdomain sekolah sudah terdaftar.</Text>
        ) : null}
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
  brand: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  logo: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E7F4F1',
    borderWidth: 1,
    borderColor: '#B7D9D3',
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
  },
  searchBox: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  warning: {
    color: colors.accent,
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    lineHeight: 20,
  },
  results: {
    gap: 10,
  },
  schoolRow: {
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.72,
  },
  schoolLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  schoolLogoFallback: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#EEF4F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolInfo: {
    flex: 1,
    minWidth: 0,
  },
  schoolName: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
  schoolSlug: {
    color: colors.muted,
    marginTop: 2,
  },
  pickText: {
    color: colors.primary,
    fontWeight: '900',
  },
  empty: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
