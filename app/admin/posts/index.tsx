import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { Link } from "expo-router";
import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";

import {
  adminListPosts,
  setModeration,
  deletePost,
} from "@/lib/posts";

const STATUS_TABS = ["all", "pending", "approved", "rejected"] as const;
const CATEGORIES = ["all", "pub", "job", "janaza", "regular"] as const;
type StatusTab = typeof STATUS_TABS[number];
type CategoryTab = typeof CATEGORIES[number];

export default function AdminPostsModeration() {
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("pending");
  const [categoryFilter, setCategoryFilter] = useState<CategoryTab>("all");

  async function load() {
    setLoading(true);

    const status = statusFilter === "all" ? undefined : (statusFilter as Exclude<StatusTab, "all">);
    let items = await adminListPosts(status);

    if (categoryFilter !== "all") {
      items = items.filter((p) => p.category === categoryFilter);
    }

    setPosts(items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [statusFilter, categoryFilter]);

  async function approvePost(id: string) {
    setLoading(true);
    await setModeration(id, "approved");
    await load();
  }

  async function rejectPost(id: string) {
    setLoading(true);
    await setModeration(id, "rejected");
    await load();
  }

  async function removePost(id: string) {
    setLoading(true);
    await deletePost(id);
    await load();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="Posts Moderation" />

      <View style={{ padding: 16 }}>

        {/* STATUS FILTER TABS */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {STATUS_TABS.map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                backgroundColor: statusFilter === s ? theme.primary : theme.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: statusFilter === s ? "#fff" : theme.text,
                  fontWeight: "600",
                }}
              >
                {s.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CATEGORY FILTER */}
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setCategoryFilter(c)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 14,
                backgroundColor:
                  categoryFilter === c ? theme.primary : theme.card,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text
                style={{
                  color: categoryFilter === c ? "#fff" : theme.text,
                  fontWeight: "600",
                }}
              >
                {c.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* CONTENT */}
        {loading && (
          <ActivityIndicator
            size="large"
            color={theme.primary}
            style={{ marginTop: 20 }}
          />
        )}

        {!loading && posts.length === 0 && (
          <Text style={{ color: theme.placeholder, marginTop: 20 }}>
            No posts found.
          </Text>
        )}

        {/* POST LIST */}
        {posts.map((post) => (
          <View
            key={post.id}
            style={{
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 16,
            }}
          >
            {/* TITLE + LINK */}
            <Link
              href={{
                pathname: "/admin/posts/[id]",
                params: { id: post.id },
              }}
              asChild
            >
              <TouchableOpacity>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {post.title}
                </Text>

                <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                  Category: {post.category}
                </Text>
              </TouchableOpacity>
            </Link>

            {post.description && (
              <Text style={{ color: theme.text, marginTop: 8 }}>
                {post.description}
              </Text>
            )}

            {/* ACTION BUTTONS */}
            <View
              style={{
                flexDirection: "row",
                marginTop: 14,
                justifyContent: "space-between",
              }}
            >
              {/* APPROVE */}
              <TouchableOpacity
                onPress={() => approvePost(post.id)}
                style={{
                  backgroundColor: "#10b981",
                  padding: 10,
                  borderRadius: 8,
                  width: "48%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Approve
                </Text>
              </TouchableOpacity>

              {/* DELETE */}
              <TouchableOpacity
                onPress={() => removePost(post.id)}
                style={{
                  backgroundColor: "#ef4444",
                  padding: 10,
                  borderRadius: 8,
                  width: "48%",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
