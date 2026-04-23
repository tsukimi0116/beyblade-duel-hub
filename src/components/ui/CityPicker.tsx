import React, { useState } from 'react';
import {
  Modal, View, Text, StyleSheet, TouchableOpacity,
  FlatList, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

const TAIWAN_CITIES = [
  '台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市',
  '基隆市', '新竹市', '嘉義市',
  '新竹縣', '苗栗縣', '彰化縣', '南投縣', '雲林縣',
  '嘉義縣', '屏東縣', '宜蘭縣', '花蓮縣', '台東縣',
  '澎湖縣', '金門縣', '連江縣',
];

interface CityPickerProps {
  label?: string;
  value?: string;
  onChange: (city: string | undefined) => void;
  error?: string;
  style?: object;
}

export function CityPicker({ label, value, onChange, error, style }: CityPickerProps) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const select = (city: string) => {
    onChange(city);
    setVisible(false);
  };

  const clear = () => {
    onChange(undefined);
    setVisible(false);
  };

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: colors.surface, borderColor: error ? colors.error : colors.border }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.valueText, { color: value ? colors.textPrimary : colors.textMuted }]}>
          {value || '請選擇城市'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>
      {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <SafeAreaView style={[styles.sheet, { backgroundColor: colors.background }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>選擇城市</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={TAIWAN_CITIES}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.cityRow, { borderBottomColor: colors.border }]}
                  onPress={() => select(item)}
                >
                  <Text style={[styles.cityText, { color: colors.textPrimary }]}>{item}</Text>
                  {value === item && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                value ? (
                  <TouchableOpacity style={[styles.cityRow, { borderBottomColor: colors.border }]} onPress={clear}>
                    <Text style={[styles.cityText, { color: colors.textMuted }]}>不選擇</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: spacing.xs },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  valueText: { fontSize: typography.sizes.md },
  error: { fontSize: typography.sizes.xs, marginTop: spacing.xs },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  sheetTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold },
  cityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cityText: { fontSize: typography.sizes.md },
});
