// app/member/posts/home.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput, Image, RefreshControl
} from "react-native";
import { Link, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { getPublicFeed } from "@/lib/posts";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

const CATS = ['janazah','events','jobs','pub'] as const;
type Cat = typeof CATS[number];

function timeAgo(ts?: any) {
  try {
    if (!ts) return "";
    const d = ts?.toDate ? ts.toDate() : new Date(ts);
    if (isNaN(d.getTime())) return "";
    const s = Math.max(1, Math.floor((Date.now() - d.getTime()) / 1000));
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60); if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60); if (h < 24) return `${h}h`;
    const dd = Math.floor(h / 24); return `${dd}d`;
  } catch { return ""; }
}

function Pill({ label, tone = "default" }: { label: string; tone?: "default"|"muted"|"success"|"warning"|"danger" }) {
  const palette: Record<string, {bg:string; fg:string; border:string}> = {
    default: { bg:"#fff", fg:"#111", border:"#ddd" },
    muted:   { bg:"#f5f5f5", fg:"#555", border:"#e5e5e5" },
    success: { bg:"#ecfdf5", fg:"#065f46", border:"#a7f3d0" },
    warning: { bg:"#fffbeb", fg:"#92400e", border:"#fcd34d" },
    danger:  { bg:"#fef2f2", fg:"#991b1b", border:"#fecaca" },
  };
  const c = palette[tone] ?? palette.default;
  return (
    <View style={{ paddingHorizontal:10, paddingVertical:4, borderRadius:999, borderWidth:1, borderColor:c.border, backgroundColor:c.bg }}>
      <Text style={{ color:c.fg, fontSize:12 }}>{label}</Text>
    </View>
  );
}

function statusTone(s?: string): "muted"|"success"|"warning"|"danger"|"default" {
  switch (s) {
    case "approved": return "success";
    case "pending": return "warning";
    case "rejected": return "danger";
    default: return "muted";
  }
}

function PostCard({ item }: { item: any }) {
  return (
    <View style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 12, padding: 12, backgroundColor:"#fff" }}>
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

      {/* title & description */}
      {item.title ? <Text style={{ marginTop: 10, fontSize: 16, fontWeight: "600" }}>{item.title}</Text> : null}
      {item.description ? <Text style={{ marginTop: 6 }}>{item.description}</Text> : null}
      {item.imageUrl ? (
        <Image source={{ uri: String(item.imageUrl) }} style={{ height: 180, borderRadius: 10, marginTop: 10 }} />
      ) : null}

      {/* badges */}
      <View style={{ flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap' }}>
        {item.category ? <Pill label={String(item.category)} tone="muted" /> : null}
        {item.status ? <Pill label={String(item.status)} tone={statusTone(item.status)} /> : null}
      </View>

      {/* actions (placeholders) */}
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

function ComposerCard({
  selectedCat, onSelectCat,
}: {
  selectedCat: Cat;
  onSelectCat: (c: Cat) => void;
}) {
  const router = useRouter();

  const openComposer = useCallback(() => {
    router.push({ pathname: "/member/posts/new", params: { category: selectedCat } });
  }, [router, selectedCat]);

  return (
    <View style={{ borderWidth:1, borderColor:"#ddd", borderRadius:12, padding:12, backgroundColor:"#fff" }}>
      <View style={{ flexDirection:"row", alignItems:"center", gap:10 }}>
        <View style={{ width:36, height:36, borderRadius:18, alignItems:"center", justifyContent:"center", borderWidth:1, borderColor:"#ddd" }}>
          <Feather name="user" size={18} />
        </View>

        {/* Faux input */}
        <TouchableOpacity
          onPress={openComposer}
          style={{ flex:1, borderWidth:1, borderColor:"#ddd", borderRadius:999, paddingHorizontal:14, paddingVertical:10, justifyContent:"center" }}
          activeOpacity={0.7}
        >
          <Text style={{ color:"#666" }}>What do you want to post today?</Text>
        </TouchableOpacity>
      </View>

      {/* category chips */}
      <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8, marginTop:12 }}>
        {(CATS as readonly Cat[]).map(c => {
          const active = c === selectedCat;
          return (
            <TouchableOpacity
              key={c}
              onPress={()=>onSelectCat(c)}
              style={{
                paddingHorizontal:12, paddingVertical:8, borderRadius:999, borderWidth:1,
                borderColor: active ? "#1e90ff" : "#ddd",
                backgroundColor: active ? "#1e90ff" : "#fff",
              }}
            >
              <Text style={{ color: active ? "#fff" : "#111" }}>{c}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* quick actions */}
      <View style={{ flexDirection:"row", justifyContent:"space-between", marginTop:12 }}>
        <TouchableOpacity onPress={openComposer} style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
          <Feather name="type" size={18} /><Text>Create text</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openComposer} style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
          <Feather name="image" size={18} /><Text>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openComposer} style={{ flexDirection:"row", alignItems:"center", gap:6 }}>
          <Feather name="tag" size={18} /><Text>Category</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function MemberHome() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [catForNew, setCatForNew] = useState<Cat>('janazah');

  const load = useCallback(async () => {
    console.log("load() – auth uid:", auth.currentUser?.uid);
    const data = await getPublicFeed(50);
    setItems(data);
  }, []);


  // ✅ Auth guard: fetch only when signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) load();
      else setItems([]); // or navigate to /login
    });
    return unsub;
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

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
          style={{ borderWidth: 1, borderColor: "#ddd", borderRadius: 8, paddingHorizontal: 12, height: 42, backgroundColor:"#fff" }}
          placeholderTextColor="#888"
        />
      </View>

      {/* feed */}
      {!filtered ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text>Loading…</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={{ padding: 16, rowGap: 12 }}
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <PostCard item={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListHeaderComponent={
            <View style={{ rowGap:12, marginBottom: 12 }}>
              <ComposerCard selectedCat={catForNew} onSelectCat={setCatForNew} />
              <Text style={{ fontWeight:"700", marginTop:4 }}>Latest posts</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={{ paddingVertical: 24 }}>
              <Text style={{ marginBottom: 8 }}>No posts yet.</Text>
              <Link href={{ pathname: "/member/posts/new", params: { category: catForNew } }}>
                Create the first post
              </Link>
            </View>
          }
        />
      )}

      {/* floating + */}
      <Link href={{ pathname:"/member/posts/new", params: { category: catForNew } }} asChild>
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
