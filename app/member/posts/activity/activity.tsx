import { useEffect, useState, useCallback } from "react";
import { TopBar } from "@/components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { auth, db } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import {
  collection,
  query,
  orderBy,
  getDocs,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useRouter } from "expo-router";



/* ---------------------------------------------------
   TYPES
--------------------------------------------------- */
type ActivityItem = {
  id: string;
  type: "create" | "update" | "like" | "comment";
  postId: string;
  postTitle?: string;
  category?: string;
  targetUserName?: string;
  commentText?: string;
  createdAt?: any;
};





/* ---------------------------------------------------
   TIME AGO
--------------------------------------------------- */
function timeAgo(ts: any) {
  if (!ts) return "";

  const date = ts?.toDate?.() ?? new Date(ts);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ---------------------------------------------------
   GROUPING
--------------------------------------------------- */
function groupActivities(items: ActivityItem[]) {
  const groups: Record<string, ActivityItem[]> = {
    Today: [],
    Yesterday: [],
    "This Week": [],
    Earlier: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  for (const item of items) {
    const ts = item.createdAt?.toDate?.() ?? new Date(item.createdAt);
    const date = new Date(ts);

    if (date >= today) groups.Today.push(item);
    else if (date >= yesterday) groups.Yesterday.push(item);
    else if (date >= weekStart) groups["This Week"].push(item);
    else groups.Earlier.push(item);
  }

  return groups;
}

/* ---------------------------------------------------
   ICONS FOR EACH ACTIVITY TYPE
--------------------------------------------------- */
const ICONS: Record<ActivityItem["type"], string> = {
  create: "📝",
  update: "✏️",
  like: "❤️",
  comment: "💬",
};

/* ---------------------------------------------------
   RENDER TEXT
--------------------------------------------------- */
function renderText(a: ActivityItem) {
  switch (a.type) {
    case "create":
      return `You created "${a.postTitle}" in ${a.category}`;
    case "update":
      return `You updated "${a.postTitle}"`;
    case "like":
      return `You liked ${a.targetUserName}'s post`;
    case "comment":
      return `You commented on ${a.targetUserName}'s post`;
    default:
      return "";
  }
}

export default function ActivityScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();

  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadActivity = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "activity"),
      orderBy("createdAt", "desc")
    );

    const snap = await getDocs(q);
    const data = snap.docs.map((d) => ({
      ...(d.data() as ActivityItem),
      id: d.id,
    }));

    setItems(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadActivity();
  }, []);

  const clearActivity = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const q = await getDocs(collection(db, "users", uid, "activity"));
    const deletions = q.docs.map((d) =>
      deleteDoc(doc(db, "users", uid, "activity", d.id))
    );

    await Promise.all(deletions);
    setItems([]);
  };

  const groups = groupActivities(items);
  const sections = Object.keys(groups).filter((s) => groups[s].length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      
      {/* ⭐ Top Navigation Bar */}
      <TopBar />

      {/* ⭐ Main Content */}
      <View style={{ flex: 1, padding: 16 }}>
        
        {/* CLEAR BUTTON */}
        {items.length > 0 && (
          <TouchableOpacity
            onPress={clearActivity}
            style={{
              alignSelf: "flex-end",
              marginBottom: 10,
              paddingVertical: 6,
              paddingHorizontal: 12,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 8,
            }}
          >
            <Text style={{ color: theme.text, fontWeight: "600" }}>
              Clear Activity
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={sections}
          keyExtractor={(s) => s}
          refreshControl={
            <RefreshControl
              tintColor={theme.text}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadActivity();
              }}
            />
          }
          renderItem={({ item: section }) => (
            <>
              {/* Section Header */}
              <Text
                style={{
                  color: theme.text,
                  fontSize: 18,
                  fontWeight: "700",
                  marginTop: 20,
                  marginBottom: 10,
                }}
              >
                {section}
              </Text>

              {/* Items */}
              {groups[section].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    router.push(`/member/posts/view/${item.postId}`)
                  }
                  style={{
                    padding: 14,
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: theme.border,
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 12,
                    gap: 10,
                  }}
                >
                  <Text style={{ fontSize: 20 }}>{ICONS[item.type]}</Text>

                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 15 }}>
                      {renderText(item)}
                    </Text>
                    <Text
                      style={{
                        color: theme.placeholder,
                        fontSize: 12,
                        marginTop: 4,
                      }}
                    >
                      {timeAgo(item.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

