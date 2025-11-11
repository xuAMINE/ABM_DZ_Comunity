
// lib/theme.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme, lightTheme, Theme, ThemeMode } from '@/constants/theme';

const STORAGE_KEY = '@themeMode';

type Ctx = {
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  theme: Theme;
  isDark: boolean;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') setModeState(saved);
    })();
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const effective = mode === 'system' ? (system ?? 'light') : mode;
  const isDark = effective === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  const value = useMemo(() => ({ mode, setMode, theme, isDark }), [mode, setMode, theme, isDark]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useAppTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
}
