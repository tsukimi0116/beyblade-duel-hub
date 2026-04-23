import React, { useState } from 'react';
import { TextInput, Text, View, StyleSheet, TextInputProps, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  secureToggle?: boolean;
}

export function Input({ label, error, secureToggle, secureTextEntry, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <View style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border }]}>
        <TextInput
          {...props}
          secureTextEntry={secureToggle ? !showPassword : secureTextEntry}
          placeholderTextColor={colors.textMuted}
          style={[styles.input, { color: colors.textPrimary }, style]}
        />
        {secureToggle && (
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: spacing.xs },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  input: { flex: 1, fontSize: typography.sizes.md, paddingVertical: spacing.sm },
  eyeBtn: { padding: spacing.xs },
  error: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
});
