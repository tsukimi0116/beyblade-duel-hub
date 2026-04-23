import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, shadowDark, shadowLight } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors, isDark } = useTheme();
  const shadow = isDark ? shadowDark : shadowLight;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, ...shadow }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});
