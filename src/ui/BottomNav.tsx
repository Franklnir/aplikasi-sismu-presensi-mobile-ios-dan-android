import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { MenuItem } from '../types';
import { AppIcon } from './Icon';
import { colors, shadow } from './theme';

export function BottomNav({
  items,
  active,
  onChange,
}: {
  items: MenuItem[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <Pressable key={item.id} style={styles.item} onPress={() => onChange(item.id)}>
            <View style={[styles.iconSlot, selected && styles.iconSelected]}>
              <AppIcon name={item.icon} size={20} color={selected ? '#fff' : colors.muted} />
            </View>
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 74,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: 'row',
    ...shadow,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 0,
  },
  iconSlot: {
    width: 34,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    maxWidth: '100%',
  },
  labelSelected: {
    color: colors.primaryDark,
  },
});
