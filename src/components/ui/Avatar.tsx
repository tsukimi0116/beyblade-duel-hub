import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { radius } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface AvatarProps {
  uri?: string | null;
  username?: string;
  size?: number;
}

export function Avatar({ uri, username, size = 40 }: AvatarProps) {
  const { colors } = useTheme();
  const initials = username ? username.slice(0, 2).toUpperCase() : '??';

  if (uri) {
    return <Image source={{ uri }} style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]} />;
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: {},
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initials: { color: '#FFFFFF', fontWeight: typography.weights.bold },
});
