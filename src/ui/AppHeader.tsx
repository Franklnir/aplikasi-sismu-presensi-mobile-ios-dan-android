import React from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppNotification, MenuItem, Profile, Settings } from '../types';
import { compact, initials } from '../utils/text';
import { AppIcon } from './Icon';
import { colors, shadow } from './theme';

const detailText = (profile: Profile | null, settings: Settings | null) => {
  if (!profile) return 'Belum login';
  const semester = compact(profile.semester || profile.semester_aktif || settings?.semester_aktif, '');
  const angkatan = compact(profile.angkatan, '');
  if (profile.role === 'siswa') {
    return [compact(profile.kelas || profile.kelas_id, 'Kelas -'), semester ? `Semester ${semester}` : '', angkatan ? `Angkatan ${angkatan}` : '']
      .filter(Boolean)
      .join(' | ');
  }
  if (profile.role === 'guru') {
    return [compact(profile.jabatan || 'Guru'), compact(profile.mapel, '')].filter(Boolean).join(' | ');
  }
  return [compact(profile.jabatan || 'Admin Sekolah'), compact(settings?.nama_sekolah, '')].filter(Boolean).join(' | ');
};

export function AppHeader({
  profile,
  settings,
  overflowItems,
  onSelectOverflow,
  notificationCount,
  notifications,
  onOpenNotifications,
  overflowVisible,
  setOverflowVisible,
}: {
  profile: Profile | null;
  settings: Settings | null;
  overflowItems: MenuItem[];
  onSelectOverflow: (id: string) => void;
  notificationCount: number;
  notifications: AppNotification[];
  onOpenNotifications: () => void;
  overflowVisible: boolean;
  setOverflowVisible: (visible: boolean) => void;
}) {
  const photo = profile?.photo_url || undefined;
  return (
    <View style={styles.header}>
      <View style={styles.actions}>
        {overflowItems.length > 0 ? (
          <Pressable style={styles.iconButton} onPress={() => setOverflowVisible(true)}>
            <AppIcon name="menu" size={22} color={colors.text} />
          </Pressable>
        ) : null}
        <Pressable style={styles.iconButton} onPress={onOpenNotifications}>
          <AppIcon name="bell" size={22} color={colors.text} />
          {notificationCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{notificationCount > 9 ? '9+' : notificationCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.identity}>
        <View style={styles.identityText}>
          <Text style={styles.name} numberOfLines={1}>
            {compact(profile?.nama || profile?.email, 'User')}
          </Text>
          <Text style={styles.detail} numberOfLines={2}>
            {detailText(profile, settings)}
          </Text>
        </View>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initials(profile?.nama || profile?.email)}</Text>
          </View>
        )}
      </View>

      <Modal transparent animationType="fade" visible={overflowVisible} onRequestClose={() => setOverflowVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setOverflowVisible(false)}>
          <View style={styles.overflowPanel}>
            <Text style={styles.panelTitle}>Menu lainnya</Text>
            <ScrollView>
              {overflowItems.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.overflowItem}
                  onPress={() => {
                    setOverflowVisible(false);
                    onSelectOverflow(item.id);
                  }}
                >
                  <AppIcon name={item.icon} size={18} color={colors.primary} />
                  <Text style={styles.overflowLabel}>{item.label}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    ...shadow,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  badge: {
    position: 'absolute',
    right: 4,
    top: 3,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    minWidth: 0,
  },
  identityText: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-end',
  },
  name: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 16,
  },
  detail: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'right',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DCECE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.24)',
    paddingTop: 86,
    paddingHorizontal: 14,
  },
  overflowPanel: {
    maxHeight: 420,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    ...shadow,
  },
  panelTitle: {
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  overflowItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  overflowLabel: {
    color: colors.text,
    fontWeight: '700',
  },
});
