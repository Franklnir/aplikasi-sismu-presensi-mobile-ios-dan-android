import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Settings } from '../types';
import { formatDate } from '../utils/date';
import { compact } from '../utils/text';
import { Card } from '../ui/Card';
import { colors } from '../ui/theme';

const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{compact(value)}</Text>
  </View>
);

export function SettingsScreen({ settings }: { settings: Settings | null }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Pengaturan</Text>
        <Text style={styles.subtitle}>Ringkasan konfigurasi sekolah aktif.</Text>
      </View>
      <Card>
        <Row label="Nama Sekolah" value={settings?.nama_sekolah} />
        <Row label="Tahun Ajaran" value={settings?.tahun_ajaran} />
        <Row label="Semester Aktif" value={settings?.semester_aktif} />
        <Row label="Periode Mulai" value={formatDate(settings?.periode_mulai)} />
        <Row label="Periode Selesai" value={formatDate(settings?.periode_selesai)} />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
  subtitle: { color: colors.muted, fontWeight: '700' },
  row: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  rowValue: { color: colors.text, fontWeight: '800' },
});
