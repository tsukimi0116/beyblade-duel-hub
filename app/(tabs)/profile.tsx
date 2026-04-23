import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, Alert,
} from 'react-native';
import { useAuth } from '../../src/hooks/useAuth';
import { useTheme } from '../../src/hooks/useTheme';
import { supabase } from '../../src/lib/supabase';
import { Room } from '../../src/hooks/useRooms';
import { Avatar } from '../../src/components/ui/Avatar';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { RoomCard } from '../../src/components/RoomCard';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { Card } from '../../src/components/ui/Card';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function ProfileScreen() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { colors } = useTheme();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (profile) { setUsername(profile.username); setCity(profile.city || ''); }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from('rooms').select('*, host:profiles!host_id(username, avatar_url)').eq('host_id', user.id).order('scheduled_at', { ascending: false }).then(({ data }) => setMyRooms((data as Room[]) ?? []));
    supabase.from('room_participants').select('room:rooms!room_id(*, host:profiles!host_id(username, avatar_url))').eq('user_id', user.id).then(({ data }) => {
      const rooms = (data ?? []).map((d: any) => d.room).filter(Boolean) as Room[];
      setJoinedRooms(rooms.filter(r => r.host_id !== user.id));
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ username, city: city || null, updated_at: new Date().toISOString() }).eq('id', user.id);
    setSaving(false);
    if (error) { Alert.alert('錯誤', error.message); return; }
    await refreshProfile();
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert('登出', '確定要登出嗎？', [
      { text: '取消', style: 'cancel' },
      { text: '登出', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>個人頁</Text>
        <ThemeToggle />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatarRow}>
            <Avatar uri={profile?.avatar_url} username={profile?.username} size={64} />
            <View style={styles.userInfo}>
              {editing ? (
                <>
                  <Input label="暱稱" value={username} onChangeText={setUsername} style={styles.editInput} />
                  <Input label="城市" value={city} onChangeText={setCity} placeholder="選填" style={styles.editInput} />
                </>
              ) : (
                <>
                  <Text style={[styles.username, { color: colors.textPrimary }]}>{profile?.username}</Text>
                  {profile?.city && <Text style={[styles.city, { color: colors.textSecondary }]}>{profile.city}</Text>}
                </>
              )}
            </View>
          </View>

          {editing ? (
            <View style={styles.editBtns}>
              <Button title="取消" onPress={() => setEditing(false)} variant="ghost" style={{ flex: 1 }} />
              <Button title="儲存" onPress={handleSave} loading={saving} style={{ flex: 1 }} />
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.editLink}>
              <Text style={{ color: colors.primary, fontSize: typography.sizes.sm }}>編輯個人資料</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* 我開的房 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>我開的房</Text>
        {myRooms.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>還沒有開過房間</Text>
        ) : (
          myRooms.map(r => <RoomCard key={r.id} room={r} />)
        )}

        {/* 我加入的房 */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>我加入的房</Text>
        {joinedRooms.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>還沒有加入任何房間</Text>
        ) : (
          joinedRooms.map(r => <RoomCard key={r.id} room={r} />)
        )}

        <Button title="登出" onPress={handleSignOut} variant="danger" style={styles.signOutBtn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  headerTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  profileCard: { marginBottom: spacing.xl },
  avatarRow: { flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start', marginBottom: spacing.md },
  userInfo: { flex: 1 },
  username: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  city: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  editInput: { marginBottom: spacing.xs },
  editBtns: { flexDirection: 'row', gap: spacing.sm },
  editLink: { alignSelf: 'flex-start' },
  sectionTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, marginBottom: spacing.md, marginTop: spacing.sm },
  emptyText: { fontSize: typography.sizes.sm, marginBottom: spacing.lg },
  signOutBtn: { marginTop: spacing.xl },
});
