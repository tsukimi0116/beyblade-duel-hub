import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export type BattleType = 'free_for_all' | 'one_vs_one' | 'team';
export type RoomStatus = 'open' | 'full' | 'in_progress' | 'ended' | 'cancelled';

export interface Room {
  id: string;
  host_id: string;
  title: string;
  battle_type: BattleType;
  scheduled_at: string;
  location_text: string;
  location_url: string | null;
  max_players: number;
  current_players: number;
  rules: string | null;
  is_private: boolean;
  status: RoomStatus;
  created_at: string;
  host?: { username: string; avatar_url: string | null };
}

type FilterType = 'all' | 'open' | 'ending_soon';

export function useRooms(filter: FilterType = 'all') {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    let query = supabase
      .from('rooms')
      .select('*, host:profiles!host_id(username, avatar_url)')
      .gt('scheduled_at', new Date().toISOString())
      .neq('status', 'ended')
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true });

    if (filter === 'open') query = query.eq('status', 'open');
    if (filter === 'ending_soon') query = query.eq('status', 'open');

    const { data } = await query;
    let result = (data as Room[]) ?? [];

    if (filter === 'ending_soon') {
      result = result.filter(r => r.current_players / r.max_players >= 0.6);
    }

    setRooms(result);
    setLoading(false);
    setRefreshing(false);
  }, [filter]);

  useEffect(() => { fetch(); }, [fetch]);

  return { rooms, loading, refreshing, refresh: () => fetch(true) };
}
