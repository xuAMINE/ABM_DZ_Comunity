// app/admin/notifications/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";

import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";
import { listenOpenAdminReports, markAdminReportRead } from "@/lib/adminNotifications";

function timeAgo(ts?: any) {
  try {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dd = Math.floor(h / 24);
    return `${dd}d`;
  } catch {
    return "";
  }
}

export default function AdminNotifications() {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();

  const [items, setItems] = useState<any[]>([]);

  const adminUid = auth.currentUser?.uid;

  useEffect(() => {
    const unsub = listenOpenAdminReports(setItems);
    return unsub;
  }, []);

const renderItem = ({ item }: { item: any }) => {
  const isRead = !!(adminUid && item?.readBy?.[adminUid]);

  const bg = isRead ? theme.card : isDark ? "#111827" : "#e5e7eb";

  const isPost = item.type === "post_report";
  const isMember = item.type === "member_report";

  const title = isPost
    ? (item.postTitle ?? "Reported post")
    : (item.memberName ?? "Reported member");

  const subtitleLeft = isPost ? "Reported post" : "Reported member";

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={async () => {
        if (!adminUid) return;

        try {
          await markAdminReportRead(item.id, adminUid);
        } catch (e) {
          console.log("mark read failed", e);
        }

        // ✅ Route based on report type
        if (isPost) {
          router.push({
            pathname: "/admin/posts/[id]",
            params: { id: item.postId },
          });
          return;
        }

        if (isMember) {
          // Option A: if you have an admin member details screen:
          router.push({
            pathname: "/admin/member/[uid]",
            params: { uid: item.memberUid },
          });

          // Option B: if you don't have that screen yet, comment above and do:
          // Alert.alert("Member report", `${item.memberName}\nReason: ${item.lastReason}`);
          return;
        }
      }}
      style={{
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Feather
          name={isPost ? "alert-triangle" : "user-x"}
          size={18}
          color={theme.text}
        />

        <Text style={{ color: theme.text, fontWeight: isRead ? "600" : "800", flex: 1 }}>
          {title}
        </Text>

        <Text style={{ color: theme.placeholder, fontSize: 12 }}>
          {timeAgo(item.lastReportedAt)} ago
        </Text>
      </View>

      <Text style={{ color: theme.placeholder, marginTop: 6 }}>
        {subtitleLeft} • Reported by{" "}
        <Text style={{ color: theme.text, fontWeight: "700" }}>
          {item.lastReporterName ?? "Member"}
        </Text>
        {" • "}
        <Text style={{ color: theme.text }}>
          {item.lastReason ?? "report"}
        </Text>
      </Text>
    </TouchableOpacity>
  );
};


  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="Notifications" />

      <View style={{ padding: 16, flex: 1 }}>
        {items.length === 0 ? (
          <Text style={{ color: theme.placeholder }}>
            No notifications yet.
          </Text>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 16 }}
          />
        )}
      </View>
    </View>
  );
}
