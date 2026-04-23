import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { spacing } from '../theme/spacing';

export function ThemeToggle() {
  const { toggle, isDark, colors } = useTheme();
  const opacity = useRef(new Animated.Value(1)).current;

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
    toggle();
  };

  return (
    <TouchableOpacity onPress={handleToggle} style={styles.btn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Animated.View style={{ opacity }}>
        <Ionicons name={isDark ? 'sunny' : 'moon'} size={22} color={colors.textSecondary} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: { padding: spacing.xs },
});
