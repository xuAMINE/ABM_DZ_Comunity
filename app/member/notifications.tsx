// app/member/notifications.tsx

import { useEffect, useState } from "react";
import { doc, setDoc, Timestamp } from "firebase/firestore";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  LayoutAnimation,
  UIManager,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";

import { auth, db } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";

import {
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotifications,
} from "@/lib/notifications";
import type { Notification } from "@/types/notification";

// Enable LayoutAnimation on Android
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function toDate(ts: any): Date {
  if (!ts) return new Date(0);
  if (ts.toDate) return ts.toDate();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? new Date(0) : d;
}

// ---- Aggregated notification type for UI ----
type AggregatedNotification = {
    key: string;
    docIds: string[];
    type: Notification["type"];
    postId?: string;
    postTitle?: string | null;
    createdAt: any;
    read: boolean;
    actors: {
        id: string;
        name: string;
        photoURL?: string | null;
    }[];
};

// Section header label
function getSectionLabel(d: Date): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfDay = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate()
  );

  const diffMs = startOfToday.getTime() - startOfDay.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  return "Earlier";
}

// Build a minute-bucket key for aggregation
function getMinuteBucketKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
}

// Aggregate multiple notifications into groups
function aggregateNotifications(
  items: Notification[]
): AggregatedNotification[] {
  const map = new Map<string, AggregatedNotification>();

  for (const n of items) {
    const d = toDate(n.createdAt);
    const minuteBucket = getMinuteBucketKey(d);

      const postKey = n.postId ?? "none";
      const groupKey = `${n.type}-${postKey}-${minuteBucket}`;

      const actor = {
      id: n.actorId,
      name: n.actorName,
      photoURL: n.actorPhotoURL,
    };

    const existing = map.get(groupKey);
    if (!existing) {
      map.set(groupKey, {
        key: groupKey,
        docIds: [n.id],
        type: n.type,
        postId: n.postId,
        postTitle: n.postTitle,
        createdAt: n.createdAt,
        read: !!n.read,
        actors: [actor],
      });
    } else {
      existing.docIds.push(n.id);
      // any unread makes the group unread
      existing.read = existing.read && !!n.read;
      // keep latest createdAt
      const existingDate = toDate(existing.createdAt);
      if (d.getTime() > existingDate.getTime()) {
        existing.createdAt = n.createdAt;
      }
      // avoid duplicate actor
      if (!existing.actors.some((a) => a.id === actor.id)) {
        existing.actors.push(actor);
      }
    }
  }

  const arr = Array.from(map.values());
  // sort by createdAt desc
  arr.sort((a, b) => {
    const da = toDate(a.createdAt).getTime();
    const db = toDate(b.createdAt).getTime();
    return db - da;
  });

  return arr;
}

export default function NotificationsScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const uid = auth.currentUser?.uid;

  // Load first page
 useEffect(() => {
  if (!uid) {
    console.log("🔑 No uid yet in NotificationsScreen");
    return;
  }

  let cancelled = false;

  (async () => {
    console.log("🔑 Loading notifications for", uid);
    setLoading(true);

    try {
        const baseQuery = query(
        collection(db, "users", uid, "notifications"),
        orderBy("createdAt", "desc"),
        limit(10)
        );


      const snap = await getDocs(baseQuery);
      console.log("📥 Notifications loaded:", snap.size);
      snap.forEach((d) => console.log("→", d.id, d.data()));

      if (cancelled) return;

      const list = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      })) as Notification[];

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setItems(list);
      setLastDoc(
        snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null
      );
      setHasMore(snap.docs.length === 10);
    } catch (e) {
      console.error("❌ Failed to load notifications", e);
    } finally {
      if (!cancelled) setLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [uid]); // 👈 FIX: depends on uid


        const loadMore = async () => {
        if (!hasMore || loadingMore || !lastDoc) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        setLoadingMore(true);
        try {
            const baseQuery = query(
            collection(db, "users", uid, "notifications"),
            orderBy("createdAt", "desc"),
            startAfter(lastDoc),
            limit(10)
            );

            const snap = await getDocs(baseQuery);
            const list = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
            })) as Notification[];

            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

            setItems((prev) => [...prev, ...list]);
            setLastDoc(
            snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : lastDoc
            );
            setHasMore(snap.docs.length === 10);
        } finally {
            setLoadingMore(false);
        }
        };


  const aggregated = aggregateNotifications(items);

const handleOpenNotification = async (group: AggregatedNotification) => {
  // Mark all notifications in this group as read
  await Promise.all(group.docIds.map((id) => markNotificationRead(id)));

    const any = items.find((n) => group.docIds.includes(n.id));
    if (!any) return;

    if (any.type === "friend_request" || any.type === "friend_request_accepted") {
        // Go to the friends / requests screen
        router.push("/member/friends");
    } else if (any.postId) {
        // Old behavior for like/comment
        router.push(`/member/posts/view/${any.postId}`);
    }
};


  const handleDeleteGroup = async (group: AggregatedNotification) => {
    await deleteNotifications(group.docIds);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((prev) => prev.filter((n) => !group.docIds.includes(n.id)));
  };

  const renderMessage = (group: AggregatedNotification) => {
    const total = group.actors.length;
    const names = group.actors.map((a) => a.name);

    let prefix = "";
    if (total === 1) {
      prefix = `${names[0]}`;
    } else if (total === 2) {
      prefix = `${names[0]} and ${names[1]}`;
    } else if (total === 3) {
      prefix = `${names[0]}, ${names[1]} and ${names[2]}`;
    } else if (total > 3) {
      const others = total - 3;
      prefix = `${names[0]}, ${names[1]}, ${names[2]} and ${others} others`;
    }

      let action: string;
      let titlePart = "";

      switch (group.type) {
          case "comment":
              action = "commented on your post";
              titlePart = group.postTitle ? ` "${group.postTitle}"` : "";
              break;
          case "like":
              action = "liked your post";
              titlePart = group.postTitle ? ` "${group.postTitle}"` : "";
              break;
          case "friend_request":
              action = "sent you a friend request";
              break;
          case "friend_request_accepted":
              action = "accepted your friend request";
              break;
          default:
              action = "did something";
      }

      if (!prefix) {
          // fallback in case actors array is empty
          prefix = "Someone";
      }

      return `${prefix} ${action}${titlePart}`;
  };

  const renderAvatar = (group: AggregatedNotification) => {
    const first = group.actors[0];
    const initial = (first?.name?.[0] || "M").toUpperCase();

    if (first?.photoURL) {
      return (
        <Image
          source={{ uri: first.photoURL }}
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
          }}
        />
      );
    }

    return (
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>{initial}</Text>
      </View>
    );
  };

  const renderRow = ({
    item,
    index,
  }: {
    item: AggregatedNotification;
    index: number;
  }) => {
    const createdDate = toDate(item.createdAt);
    const sectionLabel = getSectionLabel(createdDate);

    const prev = aggregated[index - 1];
    const prevLabel = prev ? getSectionLabel(toDate(prev.createdAt)) : null;
    const showSectionHeader = index === 0 || sectionLabel !== prevLabel;

    const isUnread = !item.read;

    const rightActions = () => (
      <TouchableOpacity
        onPress={() => handleDeleteGroup(item)}
        style={{
          backgroundColor: "#ef4444",
          justifyContent: "center",
          alignItems: "center",
          width: 80,
          height: "100%",
          borderRadius: 12,
        }}
      >
        <Feather name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    );

    return (
      <View>
        {showSectionHeader && (
          <Text
            style={{
              marginBottom: 6,
              marginTop: index === 0 ? 0 : 10,
              fontWeight: "700",
              color: theme.placeholder,
            }}
          >
            {sectionLabel}
          </Text>
        )}

        <Swipeable renderRightActions={rightActions}>
          <TouchableOpacity
            onPress={() => handleOpenNotification(item)}
            style={{
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: isUnread ? theme.card : theme.bg,
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            {/* Avatar */}
            {renderAvatar(item)}

            {/* Text */}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: theme.text,
                  fontWeight: isUnread ? "700" : "400",
                }}
              >
                {renderMessage(item)}
              </Text>
              <Text
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: theme.placeholder,
                }}
              >
                {timeAgo(item.createdAt)} ago
              </Text>
            </View>

            {/* Unread dot */}
            {isUnread && (
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: "#ef4444",
                }}
              />
            )}
          </TouchableOpacity>
        </Swipeable>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: theme.bg }}
        edges={["top"]}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ActivityIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      {/* Simple header */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/member/posts/homepage" asChild>
          <TouchableOpacity>
            <Feather name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>
        </Link>

        <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text }}>
          Notifications
        </Text>

        <TouchableOpacity
          onPress={async () => {
            await markAllNotificationsRead();
            // Optimistic state update
            setItems((prev) =>
              prev.map((n) => ({
                ...n,
                read: true,
              }))
            );
          }}
        >
          <Text style={{ color: theme.primary, fontSize: 14 }}>Mark all read</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={aggregated}
        keyExtractor={(i) => i.key}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderRow}
        ListEmptyComponent={
          <View style={{ marginTop: 40, alignItems: "center" }}>
            <Text style={{ color: theme.placeholder }}>No notifications yet</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={{ marginTop: 10, alignItems: "center" }}>
              <TouchableOpacity
                onPress={loadMore}
                disabled={loadingMore}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                }}
              >
                <Text style={{ color: theme.text }}>
                  {loadingMore ? "Loading..." : "Load more"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )
        }
      />
    </SafeAreaView>
  );
}
