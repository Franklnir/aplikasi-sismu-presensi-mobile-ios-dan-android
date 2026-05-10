import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Schedule = {
  id: string | number;
  hari?: string | null;
  kelas?: string | null;
  kelas_id?: string | null;
  mapel?: string | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  guru_id?: string | null;
};

export function ScheduleScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<Schedule[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const rows = await api
        .db<Schedule[]>({
          table: 'jadwal',
          columns: 'id,hari,kelas,kelas_id,mapel,jam_mulai,jam_selesai,guru_id',
          order: [{ field: 'hari', dir: 'asc' }],
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
  }, [api, profile?.id]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View>
        <Text style={styles.title}>Jadwal</Text>
        <Text style={styles.subtitle}>Jadwal pelajaran sesuai akses akun.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada jadwal" />
      ) : (
        items.map((item) => (
          <Card key={String(item.id)} style={styles.card}>
            <Text style={styles.itemTitle}>{item.mapel || 'Mata pelajaran'}</Text>
            <Text style={styles.meta}>{item.hari || '-'} | {item.jam_mulai || '-'} - {item.jam_selesai || '-'}</Text>
            <Text style={styles.time}>Kelas {item.kelas || item.kelas_id || '-'}</Text>
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
  time: { color: colors.muted },
});
