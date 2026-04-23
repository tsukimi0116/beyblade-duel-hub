import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Participant } from '../hooks/useRoom';
import { useTheme } from '../hooks/useTheme';
import { Avatar } from './ui/Avatar';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface ParticipantListProps {
  participants: Participant[];
  hostId: string;
  currentUserId?: string;
  canKick?: boolean;
  onKick?: (userId: string) => void;
}

export function ParticipantList({ participants, hostId, currentUserId, canKick, onKick }: ParticipantListProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.list}>
      {participants.map(p => (
        <View key={p.id} style={styles.row}>
          <Avatar uri={p.profile.avatar_url} username={p.profile.username} size={36} />
          <Text style={[styles.name, { color: colors.textPrimary }]}>{p.profile.username}</Text>
          {p.user_id === hostId && (
            <Ionicons name="trophy" size={14} color={colors.warning} style={styles.crownIcon} />
          )}
          {canKick && p.user_id !== hostId && p.user_id !== currentUserId && (
            <TouchableOpacity onPress={() => onKick?.(p.user_id)} style={styles.kickBtn}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: typography.sizes.md },
  crownIcon: { marginLeft: -spacing.xs },
  kickBtn: { padding: spacing.xs },
});
