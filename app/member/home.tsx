// app/member/home.tsx
import { Link } from 'expo-router';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';

const light = {
  bg: '#f9f9f9',
  card: '#fff',
  text: '#111',
  sub: '#555',
  border: '#ddd',
  primary: '#1e90ff',
};
const dark = {
  bg: '#0d1117',
  card: '#161b22',
  text: '#e6edf3',
  sub: '#8b949e',
  border: '#30363d',
  primary: '#2f81f7',
};

export default function Home() {
  const cs = useColorScheme();
  const theme = cs === 'dark' ? dark : light;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
      <Text style={{ color: theme.text, fontSize: 20, fontWeight: '600', marginBottom: 6 }}>
        Welcome 👋
      </Text>
      <Text style={{ color: theme.sub, marginBottom: 16 }}>
        What would you like to do?
      </Text>

      <View style={{ gap: 12 }}>
        {/* Create a post */}
        <Link href="/member/posts/new" asChild>
          <TouchableOpacity
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Create a post</Text>
          </TouchableOpacity>
        </Link>

        {/* My posts */}
        <Link href="/member/posts" asChild>
          <TouchableOpacity
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              paddingVertical: 14,
              borderRadius: 12,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: theme.text, fontWeight: '600' }}>My posts</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
}
