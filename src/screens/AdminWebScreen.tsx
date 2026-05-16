import React, { useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { buildApiBaseUrl } from '../config/schools';
import { useAuth } from '../state/AuthContext';
import { AppIcon } from '../ui/Icon';
import { colors, shadow } from '../ui/theme';

const webTools = [
  { title: 'Pengaturan Lengkap', path: '/admin/pengaturan?menu=identity', icon: 'settings' as const },
  { title: 'Backup & Restore', path: '/admin/backup', icon: 'backup' as const },
  { title: 'WhatsApp', path: '/admin/whatsapp', icon: 'megaphone' as const },
  { title: 'Sertifikat', path: '/admin/sertifikat', icon: 'shield' as const },
  { title: 'Audit Trail', path: '/admin/audit-trail', icon: 'chart' as const },
  { title: 'Tenant & Super Admin', path: '/admin/tenants', icon: 'school' as const },
];

const nativeScope = [
  'Absensi dan scan',
  'Tugas dan quiz',
  'Siswa, guru, kelas',
  'Approval harian',
];

const buildWebUrl = (baseUrl: string, path: string) => {
  try {
    const url = new URL(path, `${baseUrl}/`);
    return url.toString();
  } catch {
    return '';
  }
};

export function AdminWebScreen() {
  const { school } = useAuth();
  const [message, setMessage] = useState('');
  const baseUrl = useMemo(() => (school ? buildApiBaseUrl(school) : ''), [school]);

  const openTool = async (path: string) => {
    setMessage('');
    const url = buildWebUrl(baseUrl, path);
    if (!url) {
      setMessage('URL sekolah belum valid.');
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setMessage('Browser tidak bisa membuka Web Admin.');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.mark}>
          <AppIcon name="globe" size={30} color="#fff" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Web Admin</Text>
          <Text style={styles.subtitle} numberOfLines={2}>{school?.host || baseUrl || school?.slug || 'Sekolah'}</Text>
        </View>
      </View>

      <View style={styles.nativePanel}>
        <Text style={styles.sectionTitle}>Native Mobile</Text>
        <View style={styles.scopeGrid}>
          {nativeScope.map((item) => (
            <View key={item} style={styles.scopeItem}>
              <AppIcon name="check" size={15} color={colors.primary} />
              <Text style={styles.scopeText}>{item}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.tools}>
        <Text style={styles.sectionTitle}>Kelola di Web</Text>
        {webTools.map((tool) => (
          <Pressable
            key={tool.path}
            style={({ pressed }) => [styles.toolRow, pressed && styles.pressed]}
            onPress={() => void openTool(tool.path)}
          >
            <View style={styles.toolIcon}>
              <AppIcon name={tool.icon} size={20} color={colors.primary} />
            </View>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <AppIcon name="external" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      {message ? <Text style={styles.warning}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 14,
  },
  header: {
    minHeight: 112,
    borderRadius: 8,
    backgroundColor: colors.primary,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    ...shadow,
  },
  mark: {
    width: 62,
    height: 62,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#EDEBFF',
    marginTop: 4,
    fontWeight: '700',
  },
  nativePanel: {
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  scopeGrid: {
    gap: 8,
  },
  scopeItem: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scopeText: {
    color: colors.text,
    fontWeight: '700',
    flex: 1,
  },
  tools: {
    gap: 9,
  },
  toolRow: {
    minHeight: 58,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
  },
  toolIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
  warning: {
    color: '#92400E',
    backgroundColor: '#FFF7ED',
    borderColor: '#FED7AA',
    borderWidth: 1,
    borderRadius: 8,
    padding: 11,
    lineHeight: 19,
    fontWeight: '700',
  },
});
