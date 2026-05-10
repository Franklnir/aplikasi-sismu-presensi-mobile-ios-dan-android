import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EduSmartApi } from '../api/client';
import type { Profile } from '../types';
import { formatDateTime } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Approval = {
  id: string | number;
  target_table?: string | null;
  target_action?: string | null;
  status?: string | null;
  summary?: string | null;
  requested_at?: string | null;
  created_at?: string | null;
};

const normalizeRows = (value: unknown): Approval[] => {
  if (Array.isArray(value)) return value as Approval[];
  if (value && typeof value === 'object') {
    const obj = value as { data?: unknown; items?: unknown; approvals?: unknown };
    if (Array.isArray(obj.data)) return obj.data as Approval[];
    if (Array.isArray(obj.items)) return obj.items as Approval[];
    if (Array.isArray(obj.approvals)) return obj.approvals as Approval[];
  }
  return [];
};

export function ApprovalsScreen({ api, profile }: { api: EduSmartApi | null; profile: Profile | null }) {
  const [items, setItems] = useState<Approval[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || profile?.role !== 'admin') return;
    setRefreshing(true);
    try {
      const raw = await api.request<{ data?: unknown }>('/api/admin/approvals', { skipCsrf: true }).catch(() => ({ data: [] }));
      setItems(normalizeRows(raw.data));
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
        <Text style={styles.title}>Approval</Text>
        <Text style={styles.subtitle}>Daftar perubahan yang membutuhkan persetujuan admin.</Text>
      </View>
      {items.length === 0 ? (
        <EmptyState title="Tidak ada approval pending" />
      ) : (
        items.map((item) => (
          <Card key={String(item.id)} style={styles.card}>
            <Text style={styles.itemTitle}>{item.summary || `${item.target_action || '-'} ${item.target_table || '-'}`}</Text>
            <Text style={styles.meta}>Status {item.status || '-'}</Text>
            <Text style={styles.time}>{formatDateTime(item.requested_at || item.created_at)}</Text>
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
