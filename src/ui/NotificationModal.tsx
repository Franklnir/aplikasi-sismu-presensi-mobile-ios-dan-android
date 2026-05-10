import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { AppNotification } from '../types';
import { formatDateTime } from '../utils/date';
import { Button } from './Button';
import { colors, shadow } from './theme';

const kindColor: Record<AppNotification['kind'], string> = {
  task_due: colors.danger,
  task_upcoming: colors.accent,
  announcement: colors.info,
  account: colors.primary,
  system: colors.slate,
};

export function NotificationModal({
  visible,
  items,
  onClose,
  onOpenItem,
}: {
  visible: boolean;
  items: AppNotification[];
  onClose: () => void;
  onOpenItem?: (item: AppNotification) => void;
}) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.panel}>
          <View style={styles.top}>
            <Text style={styles.title}>Notifikasi</Text>
            <Pressable onPress={onClose} style={styles.close}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>
          <ScrollView style={styles.list}>
            {items.length === 0 ? (
              <Text style={styles.empty}>Tidak ada notifikasi baru.</Text>
            ) : (
              items.map((item) => (
                <Pressable
                  key={item.id}
                  style={styles.item}
                  onPress={() => {
                    onClose();
                    onOpenItem?.(item);
                  }}
                >
                  <View style={[styles.dot, { backgroundColor: kindColor[item.kind] }]} />
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemText}>{item.body}</Text>
                    {item.createdAt ? <Text style={styles.time}>{formatDateTime(item.createdAt)}</Text> : null}
                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
          <Button label="Tutup" onPress={onClose} variant="secondary" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
    padding: 18,
    justifyContent: 'center',
  },
  panel: {
    maxHeight: '78%',
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    ...shadow,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  close: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontWeight: '900',
    color: colors.muted,
  },
  list: {
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 5,
  },
  itemBody: {
    flex: 1,
    gap: 3,
  },
  itemTitle: {
    color: colors.text,
    fontWeight: '900',
  },
  itemText: {
    color: colors.slate,
    lineHeight: 20,
  },
  time: {
    color: colors.muted,
    fontSize: 12,
  },
  empty: {
    color: colors.muted,
    paddingVertical: 24,
    textAlign: 'center',
  },
});
