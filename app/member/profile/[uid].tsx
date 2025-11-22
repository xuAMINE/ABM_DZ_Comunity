import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/TopBar";


import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
} from "react-native";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import { Feather } from "@expo/vector-icons";

// ----------------------------------
// TYPES
// ----------------------------------
type MemberProfile = {
  fullName?: string;
  email?: string;
  city?: string;
  state?: string;
  photoURL?: string;
  createdAt?: any;
};

type Post = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: any;
  category?: string;
  status?: string;
};

// ----------------------------------
// MAIN PAGE
// ----------------------------------
export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams();
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!uid) return;

    const load = async () => {
      // Load Profile
      const snap = await getDoc(doc(db, "members", String(uid)));
      if (snap.exists()) {
        setProfile(snap.data() as MemberProfile);
      } else {
        setProfile({ fullName: "Unknown Member" });
      }

      // Load Posts
      const q = query(
        collection(db, "posts"),
        where("authorId", "==", String(uid))
      );
      const docsSnap = await getDocs(q);

      const items: Post[] = docsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      // Sort by date
      items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });

      setPosts(items);
      setLoading(false);
    };

    load();
  }, [uid]);

  if (loading) {
    return (
      <View style={{ flex:1, justifyContent:"center", alignItems:"center", backgroundColor:theme.bg }}>
        <ActivityIndicator color={theme.text}/>
      </View>
    );
  }if (loading) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: theme.bg,
      }}
    >
      <ActivityIndicator color={theme.text} />
    </View>
  );
}

return (
  <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
    {/* ⭐ Global Navigation Bar */}
    <TopBar />

    {/* ⭐ Public Profile Content */}
    <FlatList
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <>
          {/* Profile Card */}
          <View
            style={{
              backgroundColor: theme.card,
              padding: 16,
              borderRadius: 16,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            {profile?.photoURL ? (
              <Image
                source={{ uri: profile.photoURL }}
                style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }}
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
                <Text style={{ color: "#fff", fontSize: 30, fontWeight: "700" }}>
                  {(profile?.fullName || "M")[0].toUpperCase()}
                </Text>
              </View>
            )}

            <Text style={{ fontSize: 20, fontWeight: "700", color: theme.text }}>
              {profile?.fullName}
            </Text>

            {profile?.city && (
              <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                {profile.city}, {profile.state}
              </Text>
            )}
          </View>

          <Text
            style={{
              fontSize: 18,
              fontWeight: "700",
              color: theme.text,
              marginBottom: 12,
            }}
          >
            Posts by {profile?.fullName}
          </Text>
        </>
      }
      data={posts}
      keyExtractor={(i) => i.id}
      renderItem={({ item }) => (
        <View
          style={{
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.border,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontWeight: "700", color: theme.text }}>{item.title}</Text>

          {item.imageUrl && (
            <Image
              source={{ uri: item.imageUrl }}
              style={{ width: "100%", height: 200, borderRadius: 12, marginTop: 8 }}
            />
          )}

          <Text style={{ marginTop: 8, color: theme.text }}>
            {item.description}
          </Text>
        </View>
      )}
    />
  </SafeAreaView>
);
}
