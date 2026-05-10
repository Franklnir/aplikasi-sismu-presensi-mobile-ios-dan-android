import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { EmptyState } from '../ui/EmptyState';
import { colors } from '../ui/theme';

export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{title}</Text>
      <EmptyState title="Fitur siap ditautkan" body="Menu ini sudah masuk navigasi mobile dan dapat disambungkan ke endpoint detail berikutnya." />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, gap: 12, paddingBottom: 28 },
  title: { color: colors.text, fontWeight: '900', fontSize: 24 },
});
