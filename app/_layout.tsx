// app/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { useColorScheme } from '@/components/useColorScheme';
import { listenAuth } from '../lib/auth';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = { initialRouteName: 'login' };

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  if (!loaded) return null;
  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const segments = useSegments();
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    console.log('👟 Booting auth listener...');
    const timer = setTimeout(async () => {
      console.log('⏳ Timeout fallback — hiding splash');
      setBooted(true);
      await SplashScreen.hideAsync();
    }, 4000);

    const unsub = listenAuth(async (user) => {
      console.log('👤 Auth state changed:', user ? user.email : 'no user');
      clearTimeout(timer);

      const current = segments[0]; // current route group (e.g., 'login' or 'home')

      if (user && current !== 'home') {
        router.replace('/home');
      } else if (!user && current !== 'login') {
        router.replace('/login');
      }

      setBooted(true);
      await SplashScreen.hideAsync();
    });

    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [segments]);

  if (!booted) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack initialRouteName="login">
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Home' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
    </ThemeProvider>
  );
}
