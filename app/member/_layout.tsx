// app/member/_layout.tsx
import { Stack } from 'expo-router';
export default function MemberLayout() {
  return (
    <Stack>
      <Stack.Screen name="home" options={{ title: 'Home' }} />
      <Stack.Screen name="posts/index" options={{ title: 'My Posts' }} />
      <Stack.Screen name="posts/new" options={{ title: 'Create Post' }} />
      <Stack.Screen name="posts/[id]" options={{ title: 'Edit Post' }} />
    </Stack>
  );
}
