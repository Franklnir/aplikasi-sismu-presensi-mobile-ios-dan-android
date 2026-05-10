import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { APP_VERSION } from '../config/version';
import { useAuth } from '../state/AuthContext';
import { compact } from '../utils/text';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { colors } from '../ui/theme';

const Row = ({ label, value }: { label: string; value?: string | number | null }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{compact(value)}</Text>
  </View>
);

export function ProfileScreen() {
  const { profile, user, settings, school, logout, clearSchool, loading } = useAuth();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <Text style={styles.title}>Profil</Text>
        <Text style={styles.subtitle}>Data akun yang sedang aktif di aplikasi.</Text>
      </View>

      <Card style={styles.card}>
        <Row label="Nama" value={profile?.nama || user?.email} />
        <Row label="Role" value={profile?.role} />
        <Row label="Email" value={profile?.email || user?.email} />
        <Row label="Sekolah" value={settings?.nama_sekolah || school?.name} />
        <Row label="Subdomain" value={school?.slug} />
        <Row label="Kelas" value={profile?.kelas || profile?.kelas_id} />
        <Row label="Semester" value={profile?.semester || profile?.semester_aktif || settings?.semester_aktif} />
        <Row label="Angkatan" value={profile?.angkatan} />
        <Row label="Tahun Ajaran" value={profile?.tahun_ajaran || settings?.tahun_ajaran} />
        <Row label="Status" value={profile?.status || 'active'} />
        <Row label="Versi Aplikasi" value={APP_VERSION} />
      </Card>

      <Button label="Logout" variant="danger" onPress={() => void logout()} loading={loading} />
      <Button label="Ganti Sekolah" variant="secondary" onPress={() => void clearSchool()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
  subtitle: { color: colors.muted, fontWeight: '700' },
  card: { gap: 0 },
  row: {
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { color: colors.muted, fontSize: 12, fontWeight: '800', marginBottom: 3 },
  rowValue: { color: colors.text, fontWeight: '800' },
});
