// app/_layout.tsx
import 'react-native-gesture-handler';
import { DarkTheme as NavDark, DefaultTheme as NavLight, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { listenAuth, getMyProfile } from '../lib/auth';
import { ThemeProvider, useAppTheme } from '@/lib/theme';
import { Slot } from "expo-router";
import { PortalHost } from "@gorhom/portal";
function LayoutInner() {
  const { isDark, theme } = useAppTheme();

  // Map your theme to React Navigation theme colors
  const navTheme = {
    dark: isDark,
    colors: {
      ...(isDark ? NavDark.colors : NavLight.colors),
      background: theme.bg,
      card: theme.card,
      text: theme.text,
      border: theme.border,
      primary: theme.primary,
    },
    // Provide fonts to satisfy React Navigation Theme type (fallback to theme fonts or an empty object)
    fonts: (isDark ? (NavDark as any).fonts : (NavLight as any).fonts) || {},
  };

  return (
    <NavThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="member" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Subscribe to Firebase auth and route on change
    const unsub = listenAuth(async (user) => {
      if (!user) {
        router.replace('/login');
        return;
      }
      try {
        const profile = await getMyProfile(user.uid);
        const role = (profile?.role ?? 'member') as 'member' | 'admin';
        router.replace(role === 'admin' ? '/admin/dashboard' : '/member/posts/homepage');
      } catch {
        router.replace('/member/posts/homepage');
      }
    });
    return () => unsub();
  }, [router]);

  // Provide your app theme first, then feed it into RN Navigation
  return (
    <ThemeProvider>
      <LayoutInner />
    </ThemeProvider>
  );
}
