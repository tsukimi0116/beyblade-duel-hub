import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'open', label: '開放中' },
  { key: 'ending_soon', label: '即將額滿' },
] as const;

type FilterKey = 'all' | 'open' | 'ending_soon';

interface RoomFilterProps {
  value: FilterKey;
  onChange: (key: FilterKey) => void;
}

export function RoomFilter({ value, onChange }: RoomFilterProps) {
  const { colors } = useTheme();

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.content}>
      {FILTERS.map(f => {
        const active = f.key === value;
        return (
          <TouchableOpacity
            key={f.key}
            onPress={() => onChange(f.key)}
            style={[
              styles.chip,
              { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{f.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0, marginBottom: spacing.md },
  content: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
});
