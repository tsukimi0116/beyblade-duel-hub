import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRooms } from '../../src/hooks/useRooms';
import { useTheme } from '../../src/hooks/useTheme';
import { RoomCard } from '../../src/components/RoomCard';
import { RoomFilter } from '../../src/components/RoomFilter';
import { ThemeToggle } from '../../src/components/ThemeToggle';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

type FilterKey = 'all' | 'open' | 'ending_soon';

export default function LobbyScreen() {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<FilterKey>('all');
  const { rooms, loading, refreshing, refresh } = useRooms(filter);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.logo, { color: colors.primary, fontFamily: 'BebasNeue_400Regular' }]}>
          BeyBattle
        </Text>
        <ThemeToggle />
      </View>

      <RoomFilter value={filter} onChange={setFilter} />

      <FlatList
        data={rooms}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <RoomCard room={item} />}
        contentContainerStyle={styles.list}
        refreshing={refreshing}
        onRefresh={refresh}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Ionicons name="planet-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>目前沒有開放的房間</Text>
              <Text style={[styles.emptySubText, { color: colors.textMuted }]}>成為第一個開房的人！</Text>
            </View>
          ) : null
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/(tabs)/create')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  logo: { fontSize: 36 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: spacing.xxxl },
  emptyText: { fontSize: typography.sizes.lg, fontWeight: typography.weights.medium, marginTop: spacing.lg },
  emptySubText: { fontSize: typography.sizes.sm, marginTop: spacing.xs },
  fab: {
    position: 'absolute',
    right: spacing.xl,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
