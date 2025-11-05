// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { listenAuth, getMyProfile } from '../lib/auth';
import { useColorScheme } from 'react-native'; // keep it simple on web

export default function RootLayout() {
  const colorScheme = useColorScheme();
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
        router.replace(role === 'admin' ? '/admin/dashboard' : '/member/home');
      } catch {
        // If profile read fails, still show member home so app isn't blank
        router.replace('/member/home');
      }
    });
    return () => unsub();
  }, [router]);

  // Render the stacks immediately (no blocking "return null")
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="member" options={{ headerShown: false }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
