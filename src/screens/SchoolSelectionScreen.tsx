import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { resolveSchoolBySlug, searchSchools } from '../api/schoolDirectory';
import { appConfig, buildApiBaseUrl, normalizeSlug } from '../config/schools';
import { useAuth } from '../state/AuthContext';
import type { School } from '../types';
import { AppIcon } from '../ui/Icon';
import { colors, shadow } from '../ui/theme';

const authColors = {
  primary: '#473CD2',
  primaryDark: '#352BB3',
  primarySoft: '#EEF2FF',
  accent: '#FBBF24',
};

const schoolUrl = (school: School) => buildApiBaseUrl(school) || school.host || school.slug;

export function SchoolSelectionScreen() {
  const { selectSchool, loading } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [message, setMessage] = useState('');

  const normalizedQuerySlug = useMemo(() => normalizeSlug(query), [query]);

  const loadSchools = useCallback(async (term: string) => {
    setSearching(true);
    setMessage('');
    try {
      const schools = await searchSchools(term);
      setResults(schools);
      if (schools.length === 0 && term.trim().length === 0) {
        setMessage('Belum ada sekolah aktif dari direktori. Coba cari nama atau subdomain sekolah.');
      }
    } catch {
      setResults([]);
      setMessage('Direktori sekolah belum bisa diakses. Coba masukkan subdomain sekolah.');
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    void loadSchools('');
  }, [loadSchools]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      const term = query.trim();
      if (term.length === 1) return;
      void loadSchools(term);
    }, 260);

    return () => clearTimeout(timeout);
  }, [loadSchools, query]);

  const chooseSchool = async (school: School) => {
    await selectSchool(school);
  };

  const chooseSubdomain = async () => {
    setManualLoading(true);
    setMessage('');
    try {
      const school = await resolveSchoolBySlug(query);
      if (!school) {
        setMessage('Subdomain sekolah tidak ditemukan atau belum aktif di server.');
        return;
      }
      await selectSchool(school);
    } finally {
      setManualLoading(false);
    }
  };

  const canTrySubdomain = normalizedQuerySlug.length >= 2 && query.trim().length >= 2;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={searching} onRefresh={() => void loadSchools(query.trim())} />}
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <AppIcon name="school" size={34} color="#fff" />
          </View>
          <Text style={styles.kicker}>EduSmart Presensi</Text>
          <Text style={styles.title}>Pilih Sekolah</Text>
          <Text style={styles.subtitle}>
            Cari sekolah yang sudah terdaftar, pilih subdomainnya, lalu masuk dengan akun sekolah tersebut.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="search" size={20} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Nama sekolah atau subdomain"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor="#8A96A8"
            returnKeyType="search"
          />
          {searching ? <ActivityIndicator size="small" color={authColors.primary} /> : null}
        </View>

        <View style={styles.hintRow}>
          <AppIcon name="globe" size={15} color={authColors.primary} />
          <Text style={styles.hintText}>
            Domain produksi: {appConfig.rootDomain || 'sismu.biz.id'}
          </Text>
        </View>

        {message ? <Text style={styles.warning}>{message}</Text> : null}

        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>{query.trim() ? 'Hasil Pencarian' : 'Sekolah Aktif'}</Text>
          <Text style={styles.resultsCount}>{results.length} sekolah</Text>
        </View>

        <View style={styles.results}>
          {results.map((school) => (
            <Pressable
              key={`${school.slug}-${school.apiBaseUrl || school.host || ''}`}
              style={({ pressed }) => [styles.schoolRow, pressed && styles.pressed]}
              onPress={() => void chooseSchool(school)}
              disabled={loading}
            >
              {school.logoUrl ? (
                <Image source={{ uri: school.logoUrl }} style={styles.schoolLogo} />
              ) : (
                <View style={styles.schoolLogoFallback}>
                  <AppIcon name="school" size={22} color={authColors.primary} />
                </View>
              )}
              <View style={styles.schoolInfo}>
                <Text style={styles.schoolName} numberOfLines={1}>{school.name}</Text>
                <Text style={styles.schoolSlug} numberOfLines={1}>{school.slug}</Text>
                <Text style={styles.schoolHost} numberOfLines={1}>{schoolUrl(school)}</Text>
              </View>
              <View style={styles.pickBadge}>
                <Text style={styles.pickText}>Pilih</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {!searching && results.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Sekolah belum tampil</Text>
            <Text style={styles.emptyBody}>
              Pastikan sekolah sudah dibuat di panel super admin dan subdomainnya aktif.
            </Text>
            {canTrySubdomain ? (
              <Pressable
                style={({ pressed }) => [styles.manualButton, pressed && styles.pressed]}
                onPress={() => void chooseSubdomain()}
                disabled={manualLoading || loading}
              >
                {manualLoading ? <ActivityIndicator size="small" color="#fff" /> : <AppIcon name="globe" size={17} color="#fff" />}
                <Text style={styles.manualText}>Cek subdomain {normalizedQuerySlug}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
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
    padding: 20,
    paddingTop: 72,
    paddingBottom: 34,
    gap: 14,
  },
  hero: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: authColors.primary,
    ...shadow,
  },
  kicker: {
    color: authColors.primary,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 6,
  },
  title: {
    color: '#0F172A',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 340,
    fontWeight: '600',
  },
  searchBox: {
    minHeight: 56,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D9E0EA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    ...shadow,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 2,
  },
  hintText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  warning: {
    color: '#92400E',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    lineHeight: 19,
    fontWeight: '700',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  resultsTitle: {
    color: '#0F172A',
    fontWeight: '900',
    fontSize: 16,
  },
  resultsCount: {
    color: colors.muted,
    fontWeight: '800',
    fontSize: 12,
  },
  results: {
    gap: 10,
  },
  schoolRow: {
    minHeight: 82,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.72,
  },
  schoolLogo: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  schoolLogoFallback: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: authColors.primarySoft,
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
    color: authColors.primary,
    marginTop: 2,
    fontWeight: '800',
  },
  schoolHost: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  pickBadge: {
    minWidth: 52,
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: authColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pickText: {
    color: authColors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },
  emptyBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#fff',
    padding: 16,
    gap: 10,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '600',
  },
  manualButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: authColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 14,
    alignSelf: 'stretch',
  },
  manualText: {
    color: '#fff',
    fontWeight: '900',
  },
});
