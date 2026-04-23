import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, ColorTheme } from '../theme/colors';

type ThemeMode = 'dark' | 'light';

interface ThemeStore {
  mode: ThemeMode;
  colors: ColorTheme;
  toggle: () => Promise<void>;
  init: () => Promise<void>;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: 'dark',
  colors: darkColors,
  toggle: async () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    set({ mode: next, colors: next === 'dark' ? darkColors : lightColors });
    await AsyncStorage.setItem('themeMode', next);
  },
  init: async () => {
    const saved = (await AsyncStorage.getItem('themeMode')) as ThemeMode | null;
    if (saved) {
      set({ mode: saved, colors: saved === 'dark' ? darkColors : lightColors });
    }
  },
}));
