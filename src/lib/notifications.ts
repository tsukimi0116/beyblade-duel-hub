import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerPushToken(userId: string) {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData.data;

  await supabase
    .from('push_tokens')
    .upsert({ user_id: userId, token }, { onConflict: 'token' });

  return token;
}

export async function sendNotificationToRoom(roomId: string, title: string, body: string, excludeUserId?: string) {
  const { data: participants } = await supabase
    .from('room_participants')
    .select('user_id')
    .eq('room_id', roomId);

  if (!participants?.length) return;

  const userIds = participants.map(p => p.user_id).filter(id => id !== excludeUserId);
  if (!userIds.length) return;

  const { data: tokens } = await supabase
    .from('push_tokens')
    .select('token')
    .in('user_id', userIds);

  if (!tokens?.length) return;

  await supabase.functions.invoke('send-notification', {
    body: { tokens: tokens.map(t => t.token), title, body },
  });
}
