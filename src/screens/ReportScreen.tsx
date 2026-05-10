import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { formatDateTime } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type ReportRow = {
  id: number;
  tugas_id?: number | null;
  user_id?: string | null;
  status?: string | null;
  nilai?: number | null;
  waktu_submit?: string | null;
};

export function ReportScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<ReportRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const rows = await api
        .db<ReportRow[]>({
          table: 'tugas_jawaban',
          columns: 'id,tugas_id,user_id,status,nilai,waktu_submit',
          order: [{ field: 'waktu_submit', dir: 'desc' }],
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
        <Text style={styles.title}>Laporan</Text>
        <Text style={styles.subtitle}>Ringkasan jawaban dan nilai tugas.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada laporan" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>Tugas #{item.tugas_id || '-'}</Text>
            <Text style={styles.meta}>Siswa {item.user_id || '-'}</Text>
            <Text style={styles.time}>Status {item.status || '-'} | Nilai {item.nilai ?? '-'}</Text>
            <Text style={styles.time}>{formatDateTime(item.waktu_submit)}</Text>
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
