// app/admin/_layout.tsx
import { Stack } from 'expo-router';
export default function AdminLayout() {
  return (
    <Stack>
      <Stack.Screen name="dashboard" options={{ title: 'Admin' }} />
      <Stack.Screen name="posts/index" options={{ title: 'All Posts' }} />
      <Stack.Screen name="posts/[id]" options={{ title: 'Review Post' }} />
    </Stack>
  );
}
