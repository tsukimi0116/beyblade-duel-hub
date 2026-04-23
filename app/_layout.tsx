import { useEffect } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { useThemeStore } from '../src/store/themeStore';
import { useAuthStore } from '../src/store/authStore';

export default function RootLayout() {
  const { init: initTheme, mode } = useThemeStore();
  const { init: initAuth, session, loading } = useAuthStore();
  const segments = useSegments();

  const [fontsLoaded] = useFonts({ BebasNeue_400Regular });

  useEffect(() => {
    initTheme();
    initAuth();
  }, []);

  useEffect(() => {
    if (loading || !fontsLoaded) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, fontsLoaded]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
