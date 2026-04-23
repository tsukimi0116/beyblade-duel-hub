import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Room } from '../hooks/useRooms';
import { useTheme } from '../hooks/useTheme';
import { Badge } from './ui/Badge';
import { spacing, radius } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatShort } from '../utils/formatDate';

const BATTLE_TYPE_LABEL: Record<string, string> = {
  free_for_all: '自由亂戰',
  one_vs_one: '1v1',
  team: '組隊',
};

function PlayerBar({ current, max, colors }: { current: number; max: number; colors: any }) {
  const ratio = current / max;
  const barColor = ratio >= 0.9 ? colors.error : ratio >= 0.6 ? colors.warning : colors.success;
  return (
    <View style={[styles.barBg, { backgroundColor: colors.border }]}>
      <View style={[styles.barFill, { width: `${ratio * 100}%` as any, backgroundColor: barColor }]} />
    </View>
  );
}

function statusInfo(room: Room, colors: any) {
  if (room.status === 'full') return { label: '已滿', color: colors.statusFull };
  const ratio = room.current_players / room.max_players;
  if (ratio >= 0.6) return { label: '即將額滿', color: colors.statusEnding };
  return { label: '開放中', color: colors.statusOpen };
}

export function RoomCard({ room }: { room: Room }) {
  const { colors } = useTheme();
  const status = statusInfo(room, colors);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface }]}
      onPress={() => router.push(`/room/${room.id}`)}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={styles.badges}>
          <Badge label={BATTLE_TYPE_LABEL[room.battle_type]} color={colors.primary} />
        </View>
        <View style={styles.topRight}>
          {room.is_private && <Ionicons name="lock-closed" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />}
          <Badge label={status.label} color={status.color} />
        </View>
      </View>

      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
        {room.title}
      </Text>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]}>{formatShort(room.scheduled_at)}</Text>
      </View>
      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textSecondary }]} numberOfLines={1}>{room.location_text}</Text>
      </View>

      <View style={styles.playerRow}>
        <PlayerBar current={room.current_players} max={room.max_players} colors={colors} />
        <Text style={[styles.playerCount, { color: colors.textSecondary }]}>
          {room.current_players}/{room.max_players}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  badges: { flexDirection: 'row', gap: spacing.xs },
  topRight: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  infoText: { fontSize: typography.sizes.sm, flex: 1 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  barBg: { flex: 1, height: 4, borderRadius: radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: radius.full },
  playerCount: { fontSize: typography.sizes.xs, minWidth: 36, textAlign: 'right' },
});
