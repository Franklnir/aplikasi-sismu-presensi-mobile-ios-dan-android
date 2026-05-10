import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import { formatDateTime } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Announcement = {
  id: number;
  judul?: string | null;
  isi?: string | null;
  created_at?: string | null;
};

export function AnnouncementsScreen({ api }: { api: EduSmartApi | null }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api) return;
    setRefreshing(true);
    try {
      const rows = await api
        .db<Announcement[]>({
          table: 'pengumuman',
          columns: 'id,judul,isi,created_at',
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
  }, [api]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View>
        <Text style={styles.title}>Pengumuman</Text>
        <Text style={styles.subtitle}>Informasi terbaru untuk sekolah.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Belum ada pengumuman" />
      ) : (
        items.map((item) => (
          <Card key={item.id} style={styles.card}>
            <Text style={styles.itemTitle}>{item.judul || 'Pengumuman'}</Text>
            <Text style={styles.time}>{formatDateTime(item.created_at)}</Text>
            <Text style={styles.body}>{item.isi || '-'}</Text>
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
  card: { gap: 5 },
  itemTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
  time: { color: colors.muted, fontSize: 12 },
  body: { color: colors.slate, lineHeight: 21 },
});
