// app/member/posts/index.tsx
import { useEffect, useState } from 'react';
import {
  View, Text, ActivityIndicator, FlatList, useColorScheme, TouchableOpacity,
} from 'react-native';
import { Link } from 'expo-router';
import { getMyPosts } from '@/lib/posts';

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

export default function MyPosts() {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const cs = useColorScheme();
  const theme = cs === 'dark' ? dark : light;

  useEffect(() => {
    (async () => {
      try {
        const data = await getMyPosts();
        setItems(data);
      } catch (e: any) {
        setErr(e?.message ?? 'Failed to load posts');
      }
    })();
  }, []);

  if (err) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, padding: 16 }}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 18, marginBottom: 8 }}>
          My Posts
        </Text>
        <Text style={{ color: theme.sub, marginBottom: 12 }}>{err}</Text>
        <Link href="/member/posts/new" style={{ color: theme.primary }}>Create a post</Link>
      </View>
    );
  }

  if (!items) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderColor: theme.border, backgroundColor: theme.bg }}>
        <Text style={{ color: theme.text, fontWeight: '600', fontSize: 18 }}>My Posts</Text>
        <Link href="/member/posts/new" style={{ color: theme.primary, marginTop: 8 }}>
          + Create a post
        </Link>
      </View>

      {items.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: theme.sub, marginBottom: 8 }}>You haven’t posted anything yet.</Text>
          <Link href="/member/posts/new" style={{ color: theme.primary }}>Create your first post</Link>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, gap: 10 }}
          data={items}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <View
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 12,
              }}
            >
              <Text style={{ color: theme.text, fontWeight: '600' }}>{item.title}</Text>
              <Text style={{ color: theme.sub, marginTop: 2 }}>
                {item.category} • {item.status}
              </Text>
              <Text style={{ color: theme.text, marginTop: 8 }} numberOfLines={3}>
                {item.description}
              </Text>

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                {/* Use Link to navigate to /member/posts/[id]. Keeps button feel with asChild */}
                <Link
                  href={{ pathname: '/member/posts/[id]', params: { id: item.id } }}
                  asChild
                >
                  <TouchableOpacity>
                    <Text style={{ color: theme.primary }}>View</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}
