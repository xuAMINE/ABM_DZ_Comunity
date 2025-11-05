// app/admin/dashboard.tsx
import { View, Text } from 'react-native';
import { Link } from 'expo-router';

export default function AdminDashboard() {
  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 20, fontWeight: '600', marginBottom: 12 }}>
        Admin Dashboard
      </Text>
      <Link href="/admin/posts">Review pending posts</Link>
    </View>
  );
}
