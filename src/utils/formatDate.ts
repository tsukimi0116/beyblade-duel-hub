import { format, formatDistanceToNow, differenceInHours, differenceInDays } from 'date-fns';
import { zhTW } from 'date-fns/locale';

export function formatShort(date: Date | string): string {
  return format(new Date(date), 'MM/dd HH:mm');
}

export function formatFull(date: Date | string): string {
  return format(new Date(date), 'yyyy年MM月dd日 HH:mm');
}

export function formatCountdown(date: Date | string): string {
  const target = new Date(date);
  const days = differenceInDays(target, new Date());
  const hours = differenceInHours(target, new Date()) % 24;

  if (days > 0) return `${days} 天 ${hours} 小時後開始`;
  if (hours > 0) return `${hours} 小時後開始`;
  return '即將開始';
}
