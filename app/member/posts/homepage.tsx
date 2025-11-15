// app/member/posts/homepage.tsx
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
} from "react-native";
import { Link, useRouter } from "expo-router";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getPublicFeed } from "@/lib/posts";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";

const CATS = ["janazah", "events", "jobs", "pub"] as const;
type Cat = (typeof CATS)[number];

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

function Pill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "muted" | "success" | "warning" | "danger";
}) {
  const { theme, isDark } = useAppTheme();
  const palette: Record<string, { bg: string; fg: string; border: string }> = {
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
  const c = palette[tone] ?? palette.default;
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

function statusTone(s?: string): "muted" | "success" | "warning" | "danger" | "default" {
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

function PostCard({ item }: { item: any }) {
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
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Feather name="user" size={18} color={theme.text} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700", color: theme.text }}>
            {item.authorName ?? "Member"}
          </Text>
          <Text style={{ fontSize: 12, color: theme.placeholder }}>
            {item.authorCity && item.authorState
              ? `${item.authorCity}, ${item.authorState} • `
              : ""}
            {timeAgo(item.createdAt)} ago
          </Text>
        </View>
        <Feather name="more-horizontal" size={20} color={theme.text} />
      </View>

      {/* title & description */}
      {item.title ? (
        <Text
          style={{
            marginTop: 10,
            fontSize: 16,
            fontWeight: "600",
            color: theme.text,
          }}
        >
          {item.title}
        </Text>
      ) : null}
      {item.description ? (
        <Text style={{ marginTop: 6, color: theme.text }}>{item.description}</Text>
      ) : null}
      {item.imageUrl ? (
        <Image
          source={{ uri: String(item.imageUrl) }}
          style={{ height: 180, borderRadius: 10, marginTop: 10 }}
        />
      ) : null}

      {/* badges */}
      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 10,
          flexWrap: "wrap",
        }}
      >
        {item.category ? <Pill label={String(item.category)} tone="muted" /> : null}
        {item.status ? <Pill label={String(item.status)} tone={statusTone(item.status)} /> : null}
        {/* “My post” tag if owned by current user */}
        {auth.currentUser && item.ownerId === auth.currentUser.uid && (
          <Pill label="My post" tone="success" />
        )}
      </View>

      {/* actions (placeholders) */}
      <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="heart" size={20} color={theme.text} />
          <Text style={{ color: theme.text }}>Favorite</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="message-circle" size={20} color={theme.text} />
          <Text style={{ color: theme.text }}>Comment</Text>
        </TouchableOpacity>
      </View>

      {/* details */}
      <View style={{ marginTop: 10 }}>
        <Link href={{ pathname: "/member/posts/[id]", params: { id: item.id } }}>
          <Text style={{ color: theme.primary }}>View details</Text>
        </Link>
      </View>
    </View>
  );
}

function ComposerCard({
  selectedCat,
  onSelectCat,
}: {
  selectedCat: Cat;
  onSelectCat: (c: Cat) => void;
}) {
  const router = useRouter();
  const { theme } = useAppTheme();

  const openComposer = useCallback(() => {
    router.push({ pathname: "/member/posts/new", params: { category: selectedCat } });
  }, [router, selectedCat]);

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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <Feather name="user" size={18} color={theme.text} />
        </View>

        {/* Faux input */}
        <TouchableOpacity
          onPress={openComposer}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 999,
            paddingHorizontal: 14,
            paddingVertical: 10,
            justifyContent: "center",
          }}
          activeOpacity={0.7}
        >
          <Text style={{ color: theme.placeholder }}>What do you want to post today?</Text>
        </TouchableOpacity>
      </View>

      {/* category chips */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 8,
          marginTop: 12,
        }}
      >
        {(CATS as readonly Cat[]).map((c) => {
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
                backgroundColor: active ? theme.primary : theme.chipBg,
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: active ? "#fff" : theme.text }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* quick actions */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="type" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Create text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="image" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={openComposer}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          activeOpacity={0.7}
        >
          <Feather name="tag" size={18} color={theme.text} />
          <Text style={{ color: theme.text }}>Category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MemberHome() {
  const { theme } = useAppTheme();
  const nav = useNavigation();

  // Hide default Expo Router header
  // ⬇️ THIS FIXES THE “posts/homepage” TITLE ISSUE
  const HideHeader = <Stack.Screen options={{ headerShown: false }} />;

  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [catForNew, setCatForNew] = useState<Cat>("janazah");

  // Load feed
  const load = useCallback(async () => {
    const data = await getPublicFeed(50);
    setItems(data);
  }, []);

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) load();
      else setItems([]);
    });
    return unsub;
  }, [load]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  // Search filter
  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (p) =>
        String(p.title || "").toLowerCase().includes(q) ||
        String(p.description || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  // Avatar initial
  const avatarLabel =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "M";
  const avatarInitial = (avatarLabel[0] || "M").toUpperCase();


return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top']}>
      {HideHeader}
      {/* Top Bar */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 16,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => (nav as any).dispatch(DrawerActions.openDrawer())}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={22} color={theme.text} />
        </TouchableOpacity>

        <Text style={{ fontWeight: "800", fontSize: 18, color: theme.text }}>
          DZ Community
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", columnGap: 16 }}>
          {/* Notification */}
          <TouchableOpacity activeOpacity={0.7}>
            <Feather name="bell" size={22} color={theme.text} />
          </TouchableOpacity>

          {/* Profile avatar */}
          <Link href="/member/profile" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.primary,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700" }}>
                  {avatarInitial}
                </Text>
              </View>
            </TouchableOpacity>
          </Link>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          value={search}
          placeholder="Search posts…"
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 8,
            paddingHorizontal: 12,
            height: 42,
            backgroundColor: theme.inputBg,
            color: theme.text,
          }}
          placeholderTextColor={theme.placeholder}
        />
      </View>

      {/* Feed */}
      {!filtered ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: theme.text }}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: 16, rowGap: 12 }}
          renderItem={({ item }) => <PostCard item={item} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListHeaderComponent={
            <View style={{ rowGap: 12, marginBottom: 12 }}>
              <ComposerCard selectedCat={catForNew} onSelectCat={setCatForNew} />
              <Text style={{ fontWeight: "700", color: theme.text }}>
                Latest posts
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

