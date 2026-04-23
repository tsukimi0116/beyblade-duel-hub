import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { useRoom } from '../../src/hooks/useRoom';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { ParticipantList } from '../../src/components/ParticipantList';
import { openMap } from '../../src/utils/mapLink';
import { formatFull, formatCountdown } from '../../src/utils/formatDate';
import { sendNotificationToRoom } from '../../src/lib/notifications';
import { spacing, radius } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

const BATTLE_TYPE_LABEL: Record<string, string> = {
  free_for_all: '自由亂戰',
  one_vs_one: '1v1',
  team: '組隊',
};

export default function RoomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { colors } = useTheme();
  const { room, participants, loading, refetch } = useRoom(id!);
  const [actionLoading, setActionLoading] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');

  if (loading || !room) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: colors.textMuted }}>載入中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isHost = room.host_id === user?.id;
  const isParticipant = participants.some(p => p.user_id === user?.id);
  const ratio = room.current_players / room.max_players;
  const statusColor = room.status === 'full' ? colors.statusFull : ratio >= 0.6 ? colors.statusEnding : colors.statusOpen;
  const statusLabel = room.status === 'full' ? '已滿' : ratio >= 0.6 ? '即將額滿' : '開放中';

  const handleJoin = async () => {
    if (room.is_private) {
      setPasswordModal(true);
      return;
    }
    await doJoin();
  };

  const doJoin = async (password?: string) => {
    if (room.is_private && room.password_hash && password !== room.password_hash) {
      Alert.alert('密碼錯誤', '請確認房間密碼後再試');
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase.from('room_participants').insert({ room_id: room.id, user_id: user!.id });
      if (error) throw error;
      await refetch();
      sendNotificationToRoom(room.id, '有人加入約戰！', `「${profile?.username}」加入了你的約戰！`, user!.id);
    } catch (e: any) {
      Alert.alert('錯誤', e.message);
    } finally {
      setActionLoading(false);
      setPasswordModal(false);
      setPasswordInput('');
    }
  };

  const handleLeave = () => {
    Alert.alert('退出約戰', '確定要退出這場約戰嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase.from('room_participants').delete().eq('room_id', room.id).eq('user_id', user!.id);
          if (error) throw error;
          sendNotificationToRoom(room.id, '有人退出約戰', `「${profile?.username}」退出了約戰`, user!.id);
          Alert.alert('已退出', '你已成功退出約戰', [
            { text: '確認', onPress: () => router.replace('/(tabs)') },
          ]);
        } catch (e: any) {
          Alert.alert('錯誤', e.message);
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  };

  const handleClose = () => {
    Alert.alert('關閉房間', '確定要關閉這個約戰房間嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '關閉', style: 'destructive', onPress: async () => {
        setActionLoading(true);
        try {
          const { error } = await supabase.from('rooms').update({ status: 'cancelled' }).eq('id', room.id);
          if (error) throw error;
          sendNotificationToRoom(room.id, '約戰已取消', `約戰「${room.title}」已被取消`, user!.id);
          Alert.alert('已關閉', '房間已成功關閉', [
            { text: '確認', onPress: () => router.replace('/(tabs)') },
          ]);
        } catch (e: any) {
          Alert.alert('錯誤', e.message);
        } finally {
          setActionLoading(false);
        }
      }},
    ]);
  };

  const handleKick = async (userId: string) => {
    await supabase.from('room_participants').delete().eq('room_id', room.id).eq('user_id', userId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerBadges}>
          <Badge label={BATTLE_TYPE_LABEL[room.battle_type]} color={colors.primary} />
          <Badge label={statusLabel} color={statusColor} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{room.title}</Text>

        {/* 時間地點卡 */}
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="time" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>{formatFull(room.scheduled_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.textPrimary }]}>{room.location_text}</Text>
          </View>
          <TouchableOpacity style={styles.mapBtn} onPress={() => openMap(room.location_text)}>
            <Ionicons name="map-outline" size={14} color={colors.primary} />
            <Text style={[styles.mapBtnText, { color: colors.primary }]}>開啟地圖</Text>
          </TouchableOpacity>
        </Card>

        {/* 人數卡 */}
        <Card style={styles.card}>
          <View style={styles.playerHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              已有 {room.current_players} / {room.max_players} 人報名
            </Text>
          </View>
          <View style={[styles.barBg, { backgroundColor: colors.border }]}>
            <View style={[styles.barFill, { width: `${ratio * 100}%` as any, backgroundColor: statusColor }]} />
          </View>
          <Text style={[styles.countdown, { color: colors.textSecondary }]}>
            {formatCountdown(room.scheduled_at)}
          </Text>
        </Card>

        {/* 規則卡 */}
        {room.rules ? (
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>規則</Text>
            <Text style={[styles.rulesText, { color: colors.textSecondary }]}>{room.rules}</Text>
          </Card>
        ) : null}

        {/* 參戰者名單 */}
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>參戰者名單</Text>
          <ParticipantList
            participants={participants}
            hostId={room.host_id}
            currentUserId={user?.id}
            canKick={isHost && room.is_private}
            onKick={handleKick}
          />
        </Card>
      </ScrollView>

      {/* 底部按鈕 */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        {isHost ? (
          <Button title="關閉房間" onPress={handleClose} variant="danger" loading={actionLoading} />
        ) : isParticipant ? (
          <Button title="退出約戰" onPress={handleLeave} variant="secondary" loading={actionLoading} />
        ) : (
          <Button
            title={room.status === 'full' ? '房間已滿' : '加入約戰'}
            onPress={handleJoin}
            loading={actionLoading}
            disabled={room.status === 'full'}
          />
        )}
      </View>

      {/* 密碼 Modal */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>輸入房間密碼</Text>
            <TextInput
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={colors.textMuted}
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <View style={styles.modalBtns}>
              <Button title="取消" onPress={() => { setPasswordModal(false); setPasswordInput(''); }} variant="ghost" style={{ flex: 1 }} />
              <Button title="確認" onPress={() => doJoin(passwordInput)} loading={actionLoading} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  headerBadges: { flexDirection: 'row', gap: spacing.sm },
  title: { fontSize: typography.sizes.xxl, fontWeight: typography.weights.bold, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  content: { paddingBottom: 100 },
  card: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: typography.sizes.md, fontWeight: typography.weights.semibold, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { flex: 1, fontSize: typography.sizes.md },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  mapBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  playerHeader: { marginBottom: spacing.sm },
  barBg: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginBottom: spacing.sm },
  barFill: { height: '100%', borderRadius: radius.full },
  countdown: { fontSize: typography.sizes.sm },
  rulesText: { fontSize: typography.sizes.md, lineHeight: 22 },
  footer: { padding: spacing.lg, borderTopWidth: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '80%', borderRadius: radius.xl, padding: spacing.xl },
  modalTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginBottom: spacing.lg, textAlign: 'center' },
  modalInput: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md, fontSize: typography.sizes.md, marginBottom: spacing.lg },
  modalBtns: { flexDirection: 'row', gap: spacing.sm },
});
