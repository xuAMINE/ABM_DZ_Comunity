// app/member/posts/comments.tsx
import { useLocalSearchParams, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { addComment, getComments, getPostById } from "@/lib/posts";
import { useAppTheme } from "@/lib/theme";
import { Feather } from "@expo/vector-icons";

export default function CommentsScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const { theme } = useAppTheme();

  const [postTitle, setPostTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // -----------------------------
  // LOAD POST + COMMENTS
  // -----------------------------
  const loadComments = async () => {
    if (!postId) return;
    setLoading(true);

    // Load post title
    const post = await getPostById(postId);
    setPostTitle(post?.title ?? "Post");

    // Load comments
    const items = await getComments(postId);
    setComments(items);

    setLoading(false);
  };

  useEffect(() => {
    loadComments();
  }, [postId]);

  // -----------------------------
  // ADD COMMENT
  // -----------------------------
  const handleSubmit = async () => {
    if (!text.trim()) return;

    setSubmitting(true);
    await addComment(postId!, text.trim());
    setText("");
    await loadComments();
    setSubmitting(false);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: theme.bg,
        }}
      >
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  return (
    <>
      {/* CLEAN TOP BAR */}
      <Stack.Screen
        options={{
          title: `Comments • ${postTitle}`,
          headerTitleAlign: "center",
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: theme.bg }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* COMMENTS LIST */}
        <FlatList
          data={comments}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View
              style={{
                marginBottom: 12,
                padding: 12,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.card,
                borderRadius: 10,
              }}
            >
              <Text style={{ fontWeight: "700", color: theme.text }}>
                {item.authorName}
              </Text>

              <Text style={{ marginTop: 4, color: theme.text }}>
                {item.text}
              </Text>
            </View>
          )}
        />

        {/* COMMENT INPUT */}
        <View
          style={{
            flexDirection: "row",
            padding: 12,
            backgroundColor: theme.card,
            borderTopWidth: 1,
            borderColor: theme.border,
          }}
        >
          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor={theme.placeholder}
            value={text}
            onChangeText={setText}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 8,
              backgroundColor: theme.inputBg,
              color: theme.text,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          />

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting || !text.trim()}
            style={{
              marginLeft: 10,
              backgroundColor: submitting ? "#ccc" : theme.primary,
              padding: 12,
              borderRadius: 8,
              justifyContent: "center",
            }}
          >
            <Feather name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
