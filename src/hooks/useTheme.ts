import { useThemeStore } from '../store/themeStore';

export function useTheme() {
  const { mode, colors, toggle } = useThemeStore();
  return { mode, colors, toggle, isDark: mode === 'dark' };
}
