import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { colors, shadow } from './theme';

type PermissionStatus = {
  camera: boolean;
  media: boolean;
  notifications: boolean;
  screenCapture: boolean;
};

const permissionRows = [
  { key: 'camera', label: 'Kamera', body: 'Untuk absen, scan, dan upload jawaban foto.' },
  { key: 'media', label: 'Galeri', body: 'Untuk memilih bukti tugas atau jawaban dari perangkat.' },
  { key: 'notifications', label: 'Notifikasi', body: 'Untuk pengingat tugas, quiz, dan info sekolah.' },
  { key: 'screenCapture', label: 'Keamanan Quiz', body: 'Untuk proteksi layar dan deteksi screenshot saat quiz strict.' },
] as const;

export function PermissionPromptModal({
  visible,
  permissions,
  loading,
  onAllow,
  onClose,
}: {
  visible: boolean;
  permissions: PermissionStatus;
  loading?: boolean;
  onAllow: () => void;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.icon}>
              <Text style={styles.iconText}>i</Text>
            </View>
            <Pressable accessibilityRole="button" style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>

          <Text style={styles.title}>Izinkan akses aplikasi</Text>
          <Text style={styles.body}>
            Aktifkan permission penting agar fitur mobile berjalan penuh setelah login.
          </Text>

          <View style={styles.list}>
            {permissionRows.map((item) => {
              const granted = permissions[item.key];
              return (
                <View key={item.key} style={styles.permissionRow}>
                  <View style={[styles.dot, granted ? styles.dotGranted : styles.dotPending]} />
                  <View style={styles.permissionTextWrap}>
                    <Text style={styles.permissionTitle}>{item.label}</Text>
                    <Text style={styles.permissionBody}>{item.body}</Text>
                  </View>
                  <Text style={[styles.state, granted ? styles.stateGranted : styles.statePending]}>
                    {granted ? 'Aktif' : 'Perlu izin'}
                  </Text>
                </View>
              );
            })}
          </View>

          <Button label="Izinkan Sekarang" onPress={onAllow} loading={loading} />
          <Button label="Nanti" variant="secondary" onPress={onClose} disabled={loading} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 18,
    gap: 12,
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  iconText: {
    color: colors.info,
    fontWeight: '900',
    fontSize: 18,
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  closeText: {
    color: colors.slate,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  body: {
    color: colors.muted,
    lineHeight: 20,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  permissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotGranted: {
    backgroundColor: colors.success,
  },
  dotPending: {
    backgroundColor: colors.accent,
  },
  permissionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  permissionTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  permissionBody: {
    color: colors.muted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
  },
  state: {
    fontSize: 11,
    fontWeight: '900',
  },
  stateGranted: {
    color: colors.success,
  },
  statePending: {
    color: colors.accent,
  },
});
