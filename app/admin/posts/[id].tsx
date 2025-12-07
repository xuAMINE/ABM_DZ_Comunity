// app/admin/posts/[id].tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { useLocalSearchParams, useRouter } from "expo-router";
import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";

import {
  getPostById,
  setModeration,
  deletePost,
} from "@/lib/posts";

export default function AdminPostDetail() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState<any>(null);

  async function load() {
    if (!id) return;
    setLoading(true);

    const data = await getPostById(String(id));
    setPost(data);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function approve() {
    setLoading(true);
    await setModeration(String(id), "approved");
    router.back(); // go back to moderation list
  }

  async function reject() {
    setLoading(true);
    await setModeration(String(id), "rejected");
    router.back();
  }

  async function remove() {
    setLoading(true);
    await deletePost(String(id));
    router.back();
  }

  if (loading || !post) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.bg,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }
  const canApprove = post.status !== "approved" && post.category !== "pub";


  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="Post Details" />

      <View style={{ padding: 16 }}>
        {/* TITLE */}
        <Text
          style={{
            fontSize: 20,
            fontWeight: "700",
            color: theme.text,
          }}
        >
          {post.title}
        </Text>

        {/* CATEGORY */}
        <Text style={{ color: theme.placeholder, marginTop: 4 }}>
          Category: {post.category}
        </Text>

        {/* IMAGE */}
        {post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            style={{
              width: "100%",
              height: 240,
              borderRadius: 16,
              marginVertical: 16,
            }}
          />
        )}

        {/* DESCRIPTION */}
        <Text style={{ fontSize: 16, color: theme.text, marginBottom: 20 }}>
          {post.description}
        </Text>

        {/* POST AUTHOR */}
        <View
          style={{
            padding: 12,
            borderRadius: 12,
            backgroundColor: theme.card,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 20,
          }}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "700", color: theme.text }}
          >
            Posted By
          </Text>

          <Text style={{ color: theme.placeholder, marginTop: 4 }}>
            {post.authorName}
          </Text>

          {post.authorCity && (
            <Text style={{ color: theme.placeholder }}>
              {post.authorCity}, {post.authorState}
            </Text>
          )}
        </View>

          {/* ACTION BUTTONS */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: canApprove ? "space-between" : "flex-end",
              marginTop: 10,
            }}
          >
            {/* APPROVE — only if not already approved */}
            {canApprove && (
              <TouchableOpacity
                onPress={approve}
                style={{
                  backgroundColor: "#10b981",
                  padding: 12,
                  borderRadius: 10,
                  width: "48%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Approve
                </Text>
              </TouchableOpacity>
            )}

            {/* REJECT — you can keep or also hide for approved, your choice */}
            <TouchableOpacity
              onPress={reject}
              style={{
                backgroundColor: "#f59e0b",
                padding: 12,
                borderRadius: 10,
                width: canApprove ? "48%" : "100%",
                alignItems: "center",
                marginLeft: canApprove ? 0 : 0,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                Reject
              </Text>
            </TouchableOpacity>
          </View>

          {/* DELETE BUTTON — always visible */}
          <TouchableOpacity
            onPress={remove}
            style={{
              backgroundColor: "#ef4444",
              padding: 12,
              borderRadius: 10,
              marginTop: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700" }}>
              Delete Post
            </Text>
          </TouchableOpacity>

      </View>
    </ScrollView>
  );
}
