// app/member/posts/view/[id].tsx

import { useLocalSearchParams } from "expo-router";
import { useEffect, useState, useCallback } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, Text, ScrollView, RefreshControl } from "react-native";

import { getPostById } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme";
import { PostCard } from "../homepage";
import { TopBar } from "@/components/TopBar";

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
      <SafeAreaView
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      >
        <Text style={{ color: theme.text }}>Loading post...</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      
      {/* ⭐ Global Navigation Bar */}
      <TopBar />

      {/* ⭐ Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <PostCard item={post} onEdit={() => {}} onDelete={() => {}} />
      </ScrollView>
    </SafeAreaView>
  );
}
