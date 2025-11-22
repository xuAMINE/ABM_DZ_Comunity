// app/member/profile.tsx

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { onSnapshot, collection } from "firebase/firestore";
import { toggleLike } from "@/lib/posts";


import {
  View,
  Text,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";

import { onAuthStateChanged } from "firebase/auth";
import {
  query,
  where,
  getDocs,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import { Feather } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";

// ---------------------------------------------------
// TYPES
// ---------------------------------------------------

export type MemberProfile = {
  fullName?: string;
  email?: string;
  city?: string;
  state?: string;
  zip?: string;
  photoURL?: string;
  createdAt?: any; // Firestore timestamp
};


export type Post = {
  id: string;
  title?: string;
  description?: string;
  category?: string;
  status?: string;
  imageUrl?: string;
  authorId?: string;
  authorName?: string;
  createdAt?: any; // Firestore timestamp
};

type PillTone = "default" | "muted" | "success" | "warning" | "danger";

type PillProps = {
  label: string;
  tone?: PillTone;
};

type PostCardProps = {
  item: Post;
  onDelete: (id: string) => void;
};

type ComposerCardProps = {
  selectedCat: string;
  onSelectCat: (cat: string) => void;
};

// ---------------------------------------------------
// UTILITIES
// ---------------------------------------------------

function timeAgo(ts?: any) {
  try {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";

    const s = Math.floor((Date.now() - d.getTime()) / 1000);
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

function statusTone(s?: string): PillTone {
  switch (s) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "muted";
  }
}

// ---------------------------------------------------
// Pill Badge Component
// ---------------------------------------------------

function Pill({ label, tone = "default" }: PillProps) {
  const { theme, isDark } = useAppTheme();

  const palette: Record<PillTone, { bg: string; fg: string; border: string }> = {
    default: { bg: theme.card, fg: theme.text, border: theme.border },
    muted: {
      bg: isDark ? "#111827" : "#f3f4f6",
      fg: isDark ? "#cbd5e1" : "#475569",
      border: theme.border,
    },
    success: {
      bg: isDark ? "#064e3b" : "#ecfdf5",
      fg: isDark ? "#a7f3d0" : "#065f46",
      border: isDark ? "#065f46" : "#a7f3d0",
    },
    warning: {
      bg: isDark ? "#78350f" : "#fffbeb",
      fg: isDark ? "#fde68a" : "#92400e",
      border: isDark ? "#92400e" : "#fcd34d",
    },
    danger: {
      bg: isDark ? "#7f1d1d" : "#fef2f2",
      fg: isDark ? "#fecaca" : "#991b1b",
      border: isDark ? "#ef4444" : "#fecaca",
    },
  };

  const c = palette[tone];

  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.bg,
      }}
    >
      <Text style={{ color: c.fg, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

// ---------------------------------------------------
// Post Card Component
// ---------------------------------------------------

function PostCard({ item, onDelete }: PostCardProps) {
  const { theme } = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  const MAX_CHARS = 200;
  
  
  useEffect(() => {
    if (!item?.id) return;

    const likesRef = collection(db, "posts", item.id, "likes");

    const unsubscribe = onSnapshot(likesRef, (snapshot) => {
      const userIds = snapshot.docs.map(doc => doc.id);

      setLikeCount(snapshot.size);

      const myUid = auth.currentUser?.uid;
      setLiked(myUid ? userIds.includes(myUid) : false);
    });

    return unsubscribe;
  }, [item.id]);

    const onLike = async () => {
      setLiked(prev => !prev);
      setLikeCount(prev => (liked ? prev - 1 : prev + 1));
      await toggleLike(item.id);
    };

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.card,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: "center",
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            backgroundColor: theme.card,
          }}
        >
          <Feather name="user" size={20} color={theme.text} />
        </View>

        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", color: theme.text, fontSize: 14 }}>
            {item.authorName ?? "You"}
          </Text>
          <Text style={{ fontSize: 12, color: theme.placeholder }}>
            {timeAgo(item.createdAt)} ago
          </Text>
        </View>

        {/* Edit + Delete Icons */}
        <Link
          href={{
            pathname: "/member/posts/[id]",
            params: { id: item.id },
          }}
          asChild
        >
          <TouchableOpacity style={{ marginRight: 10 }}>
            <Feather name="edit" size={20} color={theme.primary} />
          </TouchableOpacity>
        </Link>
        <TouchableOpacity onPress={() => onDelete(item.id)}>
          <Feather name="trash" size={20} color="red" />
        </TouchableOpacity>
      </View>

      {/* Title */}
      {item.title && (
        <Text
          style={{
            marginTop: 4,
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {item.title}
        </Text>
      )}

      {/* Description with “See more” */}
      {item.description && (
        <Text style={{ marginTop: 6, color: theme.text, lineHeight: 20 }}>
          {expanded || item.description.length <= MAX_CHARS
            ? item.description
            : `${item.description.slice(0, MAX_CHARS)}...`}
          {item.description.length > MAX_CHARS && !expanded && (
            <Text
              onPress={() => setExpanded(true)}
              style={{ color: theme.primary, fontWeight: "500" }}
            >
              {" "}See more
            </Text>
          )}
        </Text>
      )}

      {/* Image */}
      {item.imageUrl && (
        <Image
          source={{ uri: String(item.imageUrl) }}
          style={{ height: 220, borderRadius: 12, marginTop: 10 }}
          resizeMode="cover"
        />
      )}

      {/* Badges */}
      <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {item.category && <Pill label={item.category} tone="muted" />}
        {item.status && <Pill label={item.status} tone={statusTone(item.status)} />}
      </View>

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 12,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: theme.border,
        }}
      >
      <TouchableOpacity
        onPress={onLike}
        style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        activeOpacity={0.7}
      >
        <Feather
          name="thumbs-up"
          size={18}
          color={liked ? theme.primary : theme.text}
        />
        <Text style={{ color: theme.text }}>{likeCount} Likes</Text>
      </TouchableOpacity>

        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="message-circle" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Comment</Text>
        </TouchableOpacity>
      </View>

      {/* Optional: View Details */}
      <View style={{ marginTop: 10 }}>
        <Link href={{ pathname: "/member/posts/[id]", params: { id: item.id } }}>
          <Text style={{ color: theme.primary }}>View details</Text>
        </Link>
      </View>
    </View>
  );
}


// ---------------------------------------------------
// Composer Component
// ---------------------------------------------------

const CATS = ["janazah", "events", "jobs", "pub"] as const;

function ComposerCard({
  selectedCat,
  onSelectCat,
}: ComposerCardProps) {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: theme.border,
        borderRadius: 12,
        padding: 12,
        backgroundColor: theme.card,
      }}
    >
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: "/member/posts/new",
            params: { category: selectedCat },
          })
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 999,
          paddingHorizontal: 14,
          paddingVertical: 10,
        }}
      >
        <Feather name="type" size={18} />
        <Text style={{ color: theme.placeholder }}>Create a new post…</Text>
      </TouchableOpacity>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {CATS.map((c) => {
          const active = c === selectedCat;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => onSelectCat(c)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: active ? theme.primary : theme.border,
                backgroundColor: active ? theme.primary : theme.card,
              }}
            >
              <Text style={{ color: active ? "#fff" : theme.text }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------
// MAIN SCREEN
// ---------------------------------------------------

export default function ProfileScreen() {
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile>({});
  const [posts, setPosts] = useState<Post[]>([]);
  const [catForNew, setCatForNew] = useState<string>("janazah");

  // DELETE POST
  const deletePost = async (id: string) => {
    Alert.alert("Delete Post", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "posts", id));
          setPosts((prev) => prev.filter((p) => p.id !== id));
        },
      },
    ]);
  };

  // LOAD PROFILE + POSTS
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      // Load Profile
      const snap = await getDoc(doc(db, "members", user.uid));
      setProfile(
        snap.exists()
          ? (snap.data() as MemberProfile)
          : { fullName: user.displayName || user.email || "Member" }
      );


      // Load Posts
      const q = query(
        collection(db, "posts"),
        where("authorId", "==", user.uid)
      );
      const docsSnap = await getDocs(q);

      const items: Post[] = docsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Sort by createdAt desc
      items.sort((a, b) => {
        const ta =
          a.createdAt?.toMillis?.() ??
          (a.createdAt?.seconds || 0) * 1000;
        const tb =
          b.createdAt?.toMillis?.() ??
          (b.createdAt?.seconds || 0) * 1000;
        return tb - ta;
      });

      setPosts(items);
      setLoading(false);
    });

    return unsub;
  }, []);

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
        <ActivityIndicator />
      </View>
    );
  }

return (
  <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
    
    {/* ⭐ Global Top Navigation Bar */}
    <TopBar />

    {/* ⭐ Scrollable Content */}
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <>
          {/* PROFILE CARD */}
          <View
            style={{
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            {/* Avatar */}
            {profile.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  marginBottom: 12,
                }}
              />
            ) : (
              <View
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 30, fontWeight: "700" }}
                >
                  {(profile.fullName || "M")[0].toUpperCase()}
                </Text>
              </View>
            )}

            {/* Name */}
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.text,
                textAlign: "center",
              }}
            >
              {profile.fullName || "Member"}
            </Text>

            {/* Member since */}
            {profile.createdAt ? (
              <Text
                style={{
                  color: theme.placeholder,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                Member since{" "}
                {profile.createdAt?.toDate
                  ? profile.createdAt.toDate().toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : ""}
              </Text>
            ) : (
              <Text
                style={{
                  color: theme.placeholder,
                  marginTop: 4,
                  textAlign: "center",
                }}
              >
                New member
              </Text>
            )}

            {/* Location */}
            <View style={{ marginTop: 12 }}>
              <Text
                style={{
                  fontWeight: "600",
                  color: theme.text,
                  marginBottom: 4,
                  textAlign: "center",
                }}
              >
                Location
              </Text>
              <Text
                style={{ color: theme.placeholder, textAlign: "center" }}
              >
                {profile.city || profile.state
                  ? `${profile.city ? `${profile.city}, ` : ""}${profile.state}`
                  : "Location not provided"}
              </Text>
            </View>
          </View>

          {/* COMPOSER */}
          <ComposerCard
            selectedCat={catForNew}
            onSelectCat={setCatForNew}
          />

          <Text
            style={{
              marginTop: 20,
              fontSize: 18,
              fontWeight: "600",
              color: theme.text,
            }}
          >
            My Posts
          </Text>
        </>
      }
      data={posts}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => <PostCard item={item} onDelete={deletePost} />}
      ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      ListFooterComponent={<View style={{ height: 40 }} />}
    />
  </SafeAreaView>
);

}
