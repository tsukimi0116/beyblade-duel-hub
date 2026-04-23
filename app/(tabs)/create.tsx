import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Switch, Platform, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { generateMapUrl } from '../../src/utils/mapLink';
import { spacing, radius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const schema = z.object({
  title: z.string().min(2, '最少 2 個字').max(30, '最多 30 個字'),
  battle_type: z.enum(['free_for_all', 'one_vs_one', 'team']),
  location_text: z.string().min(3, '請輸入地址'),
  max_players: z.number().min(2).max(32),
  rules: z.string().max(200).optional(),
  is_private: z.boolean().default(false),
  password: z.string().min(4).max(20).optional(),
});

type FormData = z.infer<typeof schema>;

const BATTLE_TYPES = [
  { key: 'free_for_all', label: '自由亂戰' },
  { key: 'one_vs_one', label: '1v1' },
  { key: 'team', label: '組隊' },
] as const;

export default function CreateRoomScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(new Date(Date.now() + 3600000));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      battle_type: 'free_for_all',
      max_players: 4,
      is_private: false,
    },
  });

  const isPrivate = watch('is_private');
  const maxPlayers = watch('max_players');

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    setLoading(true);
    try {
      const locationUrl = generateMapUrl(data.location_text);
      const { data: room, error } = await supabase
        .from('rooms')
        .insert({
          host_id: user.id,
          title: data.title,
          battle_type: data.battle_type,
          scheduled_at: scheduledAt.toISOString(),
          location_text: data.location_text,
          location_url: locationUrl,
          max_players: data.max_players,
          rules: data.rules || null,
          is_private: data.is_private,
          password_hash: data.is_private && data.password ? data.password : null,
        })
        .select()
        .single();

      if (error) throw error;

      await supabase.from('room_participants').insert({ room_id: room.id, user_id: user.id });
      router.replace(`/room/${room.id}`);
    } catch (e: any) {
      Alert.alert('錯誤', e.message || '開房失敗，請再試一次');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>開房約戰</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <Input label="對戰標題" placeholder="週末陀螺大亂鬥！" value={value} onChangeText={onChange} error={errors.title?.message} />
          )}
        />

        {/* 對戰類型 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>對戰類型</Text>
        <Controller
          control={control}
          name="battle_type"
          render={({ field: { onChange, value } }) => (
            <View style={styles.segmentRow}>
              {BATTLE_TYPES.map(t => (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => onChange(t.key)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border, backgroundColor: value === t.key ? colors.primary : colors.surface },
                  ]}
                >
                  <Text style={{ color: value === t.key ? '#FFF' : colors.textSecondary, fontSize: typography.sizes.sm, fontWeight: typography.weights.medium }}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {/* 時間 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>對戰時間</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.dateBtnText, { color: colors.textPrimary }]}>
              {scheduledAt.toLocaleDateString('zh-TW')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.dateBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setShowTimePicker(true)}
          >
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.dateBtnText, { color: colors.textPrimary }]}>
              {scheduledAt.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="date"
            minimumDate={new Date()}
            onChange={(_, d) => { setShowDatePicker(false); if (d) setScheduledAt(prev => { const n = new Date(prev); n.setFullYear(d.getFullYear(), d.getMonth(), d.getDate()); return n; }); }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={scheduledAt}
            mode="time"
            onChange={(_, d) => { setShowTimePicker(false); if (d) setScheduledAt(prev => { const n = new Date(prev); n.setHours(d.getHours(), d.getMinutes()); return n; }); }}
          />
        )}

        <Controller
          control={control}
          name="location_text"
          render={({ field: { onChange, value } }) => (
            <Input label="地點" placeholder="台北市信義區市府廣場" value={value} onChangeText={onChange} error={errors.location_text?.message} />
          )}
        />

        {/* 人數 */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>人數上限</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setValue('max_players', Math.max(2, maxPlayers - 1))}
          >
            <Ionicons name="remove" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{maxPlayers}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setValue('max_players', Math.min(32, maxPlayers + 1))}
          >
            <Ionicons name="add" size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <Controller
          control={control}
          name="rules"
          render={({ field: { onChange, value } }) => (
            <Input label="規則備註（選填）" placeholder="禁止使用金屬尖頭..." value={value} onChangeText={onChange} multiline numberOfLines={3} />
          )}
        />

        {/* 密碼房 */}
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>設為密碼房</Text>
          <Controller
            control={control}
            name="is_private"
            render={({ field: { onChange, value } }) => (
              <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary }} />
            )}
          />
        </View>

        {isPrivate && (
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input label="房間密碼" placeholder="4-20 個字元" value={value} onChangeText={onChange} secureToggle error={errors.password?.message} />
            )}
          />
        )}

        <Button title="開房！" onPress={handleSubmit(onSubmit)} loading={loading} style={styles.submitBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  form: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  label: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, marginBottom: spacing.xs },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, borderWidth: 1, alignItems: 'center' },
  dateRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  dateBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 48 },
  dateBtnText: { fontSize: typography.sizes.sm },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.md },
  stepBtn: { width: 40, height: 40, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold, minWidth: 32, textAlign: 'center' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  switchLabel: { fontSize: typography.sizes.md },
  submitBtn: { marginTop: spacing.lg },
});
