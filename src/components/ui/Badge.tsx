import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { spacing, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface BadgeProps {
  label: string;
  color: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Badge({ label, color, textColor = '#FFFFFF', style }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22' }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.semibold,
  },
});
