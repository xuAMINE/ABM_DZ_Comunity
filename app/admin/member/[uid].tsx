import React, { useEffect, useState } from "react";
import { View, Text, Image, ActivityIndicator, FlatList } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";

import { db } from "@/lib/firebase";
import { doc, getDoc, getDocs, collection, where, query } from "firebase/firestore";

type MemberProfile = {
  fullName?: string;
  email?: string;
  city?: string;
  state?: string;
  photoURL?: string;
  role?: string;
  status?: string;
};

type Post = {
  id: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  createdAt?: any;
};

export default function AdminViewUserProfile() {
  const { uid } = useLocalSearchParams();
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!uid) return;
    load();
  }, [uid]);

  async function load() {
    setLoading(true);

    // Fetch profile
    const snap = await getDoc(doc(db, "members", String(uid)));
    setProfile(snap.exists() ? (snap.data() as MemberProfile) : null);

    // Fetch posts
    const q = query(collection(db, "posts"), where("authorId", "==", String(uid)));
    const docsSnap = await getDocs(q);
    const items: Post[] = docsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    items.sort((a, b) => {
      const ta = a.createdAt?.toMillis?.() ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? 0;
      return tb - ta;
    });

    setPosts(items);
    setLoading(false);
  }

  if (loading)
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="User Profile" />

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16 }}
        ListHeaderComponent={
          <>
            {/* PROFILE CARD */}
            <View
              style={{
                backgroundColor: theme.card,
                padding: 16,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
                alignItems: "center",
              }}
            >
              {profile?.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={{ width: 90, height: 90, borderRadius: 45, marginBottom: 12 }}
                />
              ) : (
                <View
                  style={{
                    width: 90,
                    height: 90,
                    borderRadius: 45,
                    backgroundColor: theme.primary,
                    justifyContent: "center",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <Text style={{ color: "#fff", fontSize: 32, fontWeight: "700" }}>
                    {(profile?.fullName || "U")[0].toUpperCase()}
                  </Text>
                </View>
              )}

              <Text style={{ fontSize: 22, fontWeight: "700", color: theme.text }}>
                {profile?.fullName}
              </Text>

              <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                {profile?.email}
              </Text>

              {profile?.city && (
                <Text style={{ color: theme.placeholder }}>
                  {profile.city}, {profile.state}
                </Text>
              )}

              {/* ROLE & STATUS */}
              <View style={{ marginTop: 10 }}>
                <Text style={{ color: theme.text }}>Role: {profile?.role}</Text>
                <Text style={{ color: theme.text }}>Status: {profile?.status}</Text>
              </View>
            </View>

            {/* TITLE */}
            <Text
              style={{
                fontSize: 18,
                fontWeight: "700",
                color: theme.text,
                marginVertical: 16,
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

            <Text style={{ marginTop: 8, color: theme.text }}>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
}
