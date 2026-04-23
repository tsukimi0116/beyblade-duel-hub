import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Room } from './useRooms';

export interface Participant {
  id: string;
  user_id: string;
  joined_at: string;
  profile: { username: string; avatar_url: string | null };
}

export function useRoom(roomId: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoom = async () => {
    const { data } = await supabase
      .from('rooms')
      .select('*, host:profiles!host_id(username, avatar_url)')
      .eq('id', roomId)
      .single();
    if (data) setRoom(data as Room);
  };

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('room_participants')
      .select('*, profile:profiles!user_id(username, avatar_url)')
      .eq('room_id', roomId)
      .order('joined_at', { ascending: true });
    if (data) setParticipants(data as Participant[]);
  };

  useEffect(() => {
    Promise.all([fetchRoom(), fetchParticipants()]).finally(() => setLoading(false));

    const channel = supabase
      .channel(`room:${roomId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` }, () => {
        fetchRoom();
        fetchParticipants();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const refetch = () => Promise.all([fetchRoom(), fetchParticipants()]);

  return { room, participants, loading, refetch };
}
