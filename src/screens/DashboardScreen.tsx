import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Assignment, Profile, Settings } from '../types';
import type { EduSmartApi } from '../api/client';
import { formatDateTime, hoursUntil } from '../utils/date';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

type Stat = { label: string; value: string | number; tone: string };

export function DashboardScreen({
  api,
  profile,
  settings,
}: {
  api: EduSmartApi | null;
  profile: Profile | null;
  settings: Settings | null;
}) {
  const [tasks, setTasks] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Array<{ id: number; judul?: string; created_at?: string }>>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    if (!api || !profile) return;
    setRefreshing(true);
    try {
      const [taskRows, announcementRows] = await Promise.all([
        api
          .db<Assignment[]>({
            table: 'tugas',
            columns: 'id,kelas,judul,mapel,mulai,deadline,created_at',
            order: [{ field: 'deadline', dir: 'asc' }],
            limit: 8,
          })
          .catch(() => []),
        api
          .db<Array<{ id: number; judul?: string; created_at?: string }>>({
            table: 'pengumuman',
            columns: 'id,judul,created_at',
            order: [{ field: 'created_at', dir: 'desc' }],
            limit: 4,
          })
          .catch(() => []),
      ]);
      setTasks(taskRows || []);
      setAnnouncements(announcementRows || []);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, profile?.id]);

  const stats = useMemo<Stat[]>(() => {
    const nearDeadline = tasks.filter((task) => {
      const hours = hoursUntil(task.deadline);
      return hours !== null && hours >= 0 && hours <= 24;
    }).length;
    return [
      { label: 'Tugas aktif', value: tasks.length, tone: colors.primary },
      { label: 'Deadline 24 jam', value: nearDeadline, tone: colors.danger },
      { label: 'Pengumuman', value: announcements.length, tone: colors.info },
      { label: 'Semester', value: settings?.semester_aktif || profile?.semester || '-', tone: colors.accent },
    ];
  }, [announcements.length, profile?.semester, settings?.semester_aktif, tasks]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <View style={styles.greeting}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>{settings?.nama_sekolah || 'EduSmart'} | {profile?.role || '-'}</Text>
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat) => (
          <Card key={stat.label} style={styles.statCard}>
            <View style={[styles.statBar, { backgroundColor: stat.tone }]} />
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </Card>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Tugas Terdekat</Text>
      {tasks.length === 0 ? (
        <EmptyState title="Belum ada tugas" body="Data akan muncul setelah tersinkron dari sekolah." />
      ) : (
        tasks.slice(0, 4).map((task) => (
          <Card key={task.id} style={styles.listCard}>
            <Text style={styles.itemTitle}>{task.judul || 'Tugas'}</Text>
            <Text style={styles.itemMeta}>{task.mapel || '-'} | {task.kelas || '-'}</Text>
            <Text style={styles.itemTime}>Deadline {formatDateTime(task.deadline)}</Text>
          </Card>
        ))
      )}

      <Text style={styles.sectionTitle}>Pengumuman Baru</Text>
      {announcements.length === 0 ? (
        <EmptyState title="Belum ada pengumuman" />
      ) : (
        announcements.map((item) => (
          <Card key={item.id} style={styles.listCard}>
            <Text style={styles.itemTitle}>{item.judul || 'Pengumuman'}</Text>
            <Text style={styles.itemTime}>{formatDateTime(item.created_at)}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  greeting: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    color: colors.text,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    minHeight: 96,
    overflow: 'hidden',
  },
  statBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.text,
  },
  statLabel: {
    color: colors.muted,
    marginTop: 4,
    fontWeight: '700',
  },
  sectionTitle: {
    marginTop: 8,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  listCard: {
    gap: 4,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 15,
  },
  itemMeta: {
    color: colors.slate,
    fontWeight: '700',
  },
  itemTime: {
    color: colors.muted,
  },
});
