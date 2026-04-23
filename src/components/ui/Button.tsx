import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, style }: ButtonProps) {
  const { colors } = useTheme();

  const bgColor = {
    primary: colors.primary,
    secondary: colors.surface,
    danger: colors.error,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    primary: '#FFFFFF',
    secondary: colors.textPrimary,
    danger: '#FFFFFF',
    ghost: colors.primary,
  }[variant];

  const borderColor = variant === 'secondary' ? colors.border : 'transparent';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: bgColor, borderColor, borderWidth: variant === 'secondary' ? 1 : 0 },
        (disabled || loading) && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  text: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  disabled: {
    opacity: 0.5,
  },
});
