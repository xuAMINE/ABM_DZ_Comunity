// app/admin/posts/reported.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { Link } from "expo-router";
import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";
import { adminGetReportedPosts } from "@/lib/posts";

type ReportRecord = {
  userId: string;
  reason: string;
  createdAt: any;
};

function isToday(d: Date) {
  const n = new Date();
  return (
    d.getDate() === n.getDate() &&
    d.getMonth() === n.getMonth() &&
    d.getFullYear() === n.getFullYear()
  );
}

function isThisWeek(d: Date) {
  const diff = Date.now() - d.getTime();
  return diff <= 7 * 24 * 60 * 60 * 1000;
}

function isThisMonth(d: Date) {
  const n = new Date();
  return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function isThisYear(d: Date) {
  const n = new Date();
  return d.getFullYear() === n.getFullYear();
}

export default function AdminReportedPosts() {
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [allPosts, setAllPosts] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "today" | "week" | "month" | "year">(
    "all"
  );

  async function load() {
    setLoading(true);
    const items = await adminGetReportedPosts();
    setAllPosts(items);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function applyFilter(post: any) {
    if (filter === "all") return true;

    return post.reports.some((r: ReportRecord) => {
      const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);

      if (filter === "today") return isToday(d);
      if (filter === "week") return isThisWeek(d);
      if (filter === "month") return isThisMonth(d);
      if (filter === "year") return isThisYear(d);

      return true;
    });
  }

  const posts = allPosts.filter(applyFilter);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="Reported Posts" />

      {/* FILTER BAR */}
      <View style={{ flexDirection: "row", justifyContent: "space-around", padding: 10 }}>
        {["all", "today", "week", "month", "year"].map((f) => (
          <TouchableOpacity key={f} onPress={() => setFilter(f as any)}>
            <Text style={{
              color: filter === f ? theme.primary : theme.text,
              fontWeight: filter === f ? "700" : "400"
            }}>
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ padding: 16 }}>
        {loading && <ActivityIndicator size="large" color={theme.primary} />}

        {!loading && posts.length === 0 && (
          <Text style={{ color: theme.placeholder, marginTop: 20 }}>
            No reported posts under this filter.
          </Text>
        )}

        {posts.map((post) => (
          <Link
            key={post.id}
            href={{ pathname: "/admin/posts/[id]", params: { id: post.id } }}
            asChild
          >
            <TouchableOpacity
              style={{
                backgroundColor: theme.card,
                padding: 16,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: theme.border,
                marginBottom: 16,
              }}
            >
              {/* TITLE */}
              <Text style={{ color: theme.text, fontWeight: "700", fontSize: 16 }}>
                {post.title}
              </Text>

              {/* TOTAL REPORTS */}
              <Text style={{ color: theme.placeholder, marginTop: 6 }}>
                🚨 {post.reportCount} people reported this post
              </Text>

              {/* GROUPED REASONS */}
              <View style={{ marginTop: 8 }}>
                {(Object.entries(post.reasonCount ?? {}) as [string, number][]).map(
                  ([reason, count], i: number) => (
                    <Text key={i} style={{ color: theme.text }}>
                      • {reason}: {String(count)} report(s)
                    </Text>
                  )
                )}
              </View>

              {/* INDIVIDUAL REPORT DETAILS */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: theme.placeholder, marginBottom: 4 }}>
                  Report details:
                </Text>
                {post.reports.map((r: ReportRecord, i: number) => {
                  const date = r.createdAt?.toDate
                    ? r.createdAt.toDate()
                    : new Date(r.createdAt);
                  return (
                    <Text key={i} style={{ color: theme.text, fontSize: 12 }}>
                      - {r.reason} by {r.userId.slice(0, 6)}… ({date.toLocaleString()})
                    </Text>
                  );
                })}
              </View>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </ScrollView>
  );
}
