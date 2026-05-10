import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { formatDateTime } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Quiz = {
  id: number;
  nama?: string | null;
  judul?: string | null;
  mapel?: string | null;
  kelas_id?: string | null;
  starts_at?: string | null;
  deadline_at?: string | null;
  created_at?: string | null;
  status?: string | null;
};

export function QuizScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<Quiz[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const rows = await api
        .db<Quiz[]>({
          table: 'quizzes',
          columns: 'id,nama,judul,mapel,kelas_id,starts_at,deadline_at,created_at,status',
          order: [{ field: 'created_at', dir: 'desc' }],
          limit: 50,
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
        <Text style={styles.title}>Quiz</Text>
        <Text style={styles.subtitle}>Daftar quiz sesuai akses akun.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada quiz" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.nama || item.judul || 'Quiz'}</Text>
            <Text style={styles.meta}>{item.mapel || '-'} | {item.kelas_id || '-'}</Text>
            <Text style={styles.time}>Mulai {formatDateTime(item.starts_at || item.created_at)}</Text>
            <Text style={styles.time}>Deadline {formatDateTime(item.deadline_at)}</Text>
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
