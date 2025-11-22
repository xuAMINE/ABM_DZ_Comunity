// app/member/posts/view/[id].tsx
import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, RefreshControl } from "react-native";
import { getPostById, updatePost, deletePost } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme";
import { PostCard } from "../homepage";

// ⚠️ We will adjust your PostCard export in a moment

export default function ViewPostScreen() {
  const { theme } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [post, setPost] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const p = await getPostById(id);
    setPost(p);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (!post)
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: theme.text }}>Loading post...</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: "Post" }} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* SHOW FULL POST WITH COMMENTS/LIKES JUST LIKE HOMEPAGE */}
        <PostCard item={post} onEdit={() => {}} onDelete={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}
