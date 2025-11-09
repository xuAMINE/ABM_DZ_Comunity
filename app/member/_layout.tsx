// app/member/_layout.tsx
import { Stack, Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { logout } from '@/lib/auth';
import { Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

export default function MemberLayout() {
  const [user, setUser] = useState<undefined | null | {}>(undefined);

  useEffect(() => {
    const off = onAuthStateChanged(auth, (u) => setUser(u ?? null));
    return off;
  }, []);

  if (user === undefined) return null;
  if (user === null) return <Redirect href="/login" />;

  return (
    <Stack>
      <Stack.Screen
        name="home"
        options={{
          title: 'Home',
          headerRight: () => (
            <Pressable onPress={logout} style={{ paddingHorizontal: 12 }}>
              <Feather name="log-out" size={18} />
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="posts/index" options={{ title: 'My Posts' }} />
      <Stack.Screen name="posts/new" options={{ title: 'Create Post' }} />
      <Stack.Screen name="posts/[id]" options={{ title: 'Edit Post' }} />
    </Stack>
  );
}
