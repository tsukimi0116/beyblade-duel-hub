import { Linking, Platform } from 'react-native';

export function generateMapUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  if (Platform.OS === 'ios') {
    return `maps://?q=${encoded}`;
  }
  return `https://maps.google.com/?q=${encoded}`;
}

export async function openMap(address: string) {
  const url = generateMapUrl(address);
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`);
  }
}
