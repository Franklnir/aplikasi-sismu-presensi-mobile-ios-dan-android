import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type DirectoryRow = {
  id: string;
  nama?: string | null;
  email?: string | null;
  role?: string | null;
  kelas?: string | null;
  status?: string | null;
  jabatan?: string | null;
};

const tableForTab = (tab: string) => {
  if (tab === 'siswa') return { title: 'Siswa', role: 'siswa' };
  if (tab === 'guru') return { title: 'Guru', role: 'guru' };
  return { title: tab === 'kelas' ? 'Kelas' : 'Data', role: '' };
};

export function DirectoryScreen({
  api,
  profile,
  tab,
}: {
  api: EduSmartApi | null;
  profile: Profile | null;
  tab: string;
}) {
  const [items, setItems] = useState<DirectoryRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const config = tableForTab(tab);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      if (tab === 'kelas') {
        const rows = await api
          .db<Array<{ id: string; nama?: string; grade?: string; wali_kelas?: string; tahun_ajaran?: string }>>({
            table: 'kelas',
            columns: 'id,nama,grade,wali_kelas,tahun_ajaran',
            order: [{ field: 'nama', dir: 'asc' }],
            limit: 100,
          })
          .catch(() => []);
        setItems((rows || []).map((row) => ({ id: row.id, nama: row.nama || row.grade, kelas: row.tahun_ajaran, jabatan: row.wali_kelas })));
        return;
      }

      const filters = config.role ? { eq: { role: config.role } } : undefined;
      const rows = await api
        .db<DirectoryRow[]>({
          table: 'profiles',
          columns: 'id,nama,email,role,kelas,status,jabatan',
          filters,
          order: [{ field: 'nama', dir: 'asc' }],
          limit: 100,
        })
        .catch(() => []);
      setItems(rows || []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profile?.id, tab]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.subtitle}>Data sesuai akses role {profile?.role || '-'}.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada data" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.nama || item.email || item.id}</Text>
            <Text style={styles.meta}>{item.role || item.jabatan || '-'} | {item.kelas || '-'}</Text>
            <Text style={styles.status}>{item.status || ''}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
  subtitle: { color: colors.muted, fontWeight: '700' },
  card: { gap: 4 },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.slate, fontWeight: '700' },
  status: { color: colors.muted },
});
