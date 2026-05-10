import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { formatDateTime } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Attendance = {
  id: number;
  uid?: string | null;
  nama?: string | null;
  kelas?: string | null;
  mapel?: string | null;
  status?: string | null;
  tanggal?: string | null;
  waktu?: string | null;
  created_at?: string | null;
};

export function AttendanceScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<Attendance[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const filters = profile.role === 'siswa' ? { eq: { uid: profile.id } } : undefined;
      const rows = await api
        .db<Attendance[]>({
          table: 'absensi',
          columns: 'id,uid,nama,kelas,mapel,status,tanggal,waktu,created_at',
          filters,
          order: [{ field: 'tanggal', dir: 'desc' }],
          limit: 80,
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
  }, [api, profile?.id]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View>
        <Text style={styles.title}>Absensi</Text>
        <Text style={styles.subtitle}>{profile?.role === 'siswa' ? 'Riwayat kehadiran Anda.' : 'Riwayat kehadiran sekolah.'}</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada data absensi" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.itemTitle}>{item.nama || item.uid || 'Siswa'}</Text>
                <Text style={styles.meta}>{item.kelas || '-'} | {item.mapel || '-'}</Text>
              </View>
              <View style={styles.pill}>
                <Text style={styles.pillText}>{item.status || '-'}</Text>
              </View>
            </View>
            <Text style={styles.time}>{formatDateTime(item.waktu || item.tanggal || item.created_at)}</Text>
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
  card: { gap: 6 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  flex: { flex: 1, minWidth: 0 },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  meta: { color: colors.slate, marginTop: 2 },
  time: { color: colors.muted },
  pill: { borderRadius: 8, backgroundColor: '#E7F4F1', paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { color: colors.primaryDark, fontWeight: '900', fontSize: 12 },
});
