import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './theme';

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 15,
  },
  body: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
