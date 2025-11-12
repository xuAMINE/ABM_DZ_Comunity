// app/member/home.tsx
// app/member/home.tsx
import { useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Image } from "react-native";
import { Link } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getPublicFeed } from "@/lib/posts";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

function timeAgo(ts?: any) {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const dd = Math.floor(h / 24); return `${dd}d`;
  } catch { return ""; }
}

function PostCard({ item }: { item: any }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12 }}>
      {/* header */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#ddd" }}>
          <Feather name="user" size={18} />
        </View>
        <View style={{ marginLeft: 10, flex: 1 }}>
          <Text style={{ fontWeight: "700" }}>{item.authorName ?? "Member"}</Text>
          <Text style={{ fontSize: 12 }}>
            {(item.authorCity && item.authorState) ? `${item.authorCity}, ${item.authorState} • ` : ""}
            {timeAgo(item.createdAt)} ago
          </Text>
        </View>
        <Feather name="more-horizontal" size={20} />
      </View>

      {/* content */}
      {item.title ? <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "600" }}>{item.title}</Text> : null}
      {item.description ? <Text style={{ marginTop: 6 }}>{item.description}</Text> : null}
      {item.imageUrl ? (
        <Image source={{ uri: String(item.imageUrl) }} style={{ height: 180, borderRadius: 10, marginTop: 10 }} />
      ) : null}

      {/* actions (placeholders for later) */}
      <View style={{ flexDirection: "row", gap: 18, marginTop: 12 }}>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="heart" size={20} /><Text>Favorite</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="message-circle" size={20} /><Text>Comment</Text>
        </TouchableOpacity>
      </View>

      {/* details */}
      <View style={{ marginTop: 10 }}>
        <Link href={{ pathname: "/member/posts/[id]", params: { id: item.id } }}>
          View details
        </Link>
      </View>
    </View>
  );
}

export default function MemberHome() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[] | null>(null);


useEffect(() => {
    (async () => {
      try {
        const data = await getPublicFeed(50);

        // For now, fetch author info directly from "members"
        const missing = Array.from(
          new Set(data.filter(p => !p.authorName && p.ownerId).map(p => String(p.ownerId)))
        );

        const profiles = await Promise.all(
          missing.map(async uid => {
            const s = await getDoc(doc(db, "members", uid)); // uses readable members
            return [uid, s.exists() ? (s.data() as any) : null] as const;
          })
        );

        const map = new Map<string, any>(profiles);

        const enriched = data.map(p => {
          if (!p.authorName && p.ownerId && map.has(p.ownerId)) {
            const m = map.get(p.ownerId) || {};
            return {
              ...p,
              authorName: m.fullName ?? m.displayName ?? "Member",
              authorCity: m.city ?? m.address?.city ?? null,
              authorState: m.state ?? m.address?.state ?? null,
              authorPhotoUrl: m.photoURL ?? null,
            };
          }
          return p;
        });

        setItems(enriched);
      } catch (err) {
        console.error("Error fetching feed:", err);
      }
    })();
  }, []);


  const filtered = useMemo(() => {
    if (!items) return null;
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(p =>
      String(p.title || "").toLowerCase().includes(q) ||
      String(p.description || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <View style={{ flex: 1 }}>
      {/* top bar */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontWeight: "800", fontSize: 18 }}>DZ Community</Text>
        <View style={{ flexDirection: "row", columnGap: 16 }}>
          <Feather name="bell" size={22} />
          <Feather name="user" size={22} />
        </View>
      </View>

      {/* search */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search posts…"
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, height: 42 }}
        />
      </View>

      {/* feed */}
      {!filtered ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ marginBottom: 8 }}>No posts yet.</Text>
          <Link href="/member/posts/new">Create the first post</Link>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, rowGap: 12 }}
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <PostCard item={item} />}
        />
      )}

      {/* floating + */}
      <Link href="/member/posts/new" asChild>
        <TouchableOpacity
          style={{
            position: "absolute", right: 20, bottom: 24,
            width: 56, height: 56, borderRadius: 28,
            alignItems: "center", justifyContent: "center",
            borderWidth: 1, borderColor: "#ddd", backgroundColor: "#fff"
          }}
        >
          <Feather name="plus" size={26} />
        </TouchableOpacity>
      </Link>
    </View>
  );
}
