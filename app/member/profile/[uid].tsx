// app/member/profile/[uid].tsx
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/TopBar";
import {
  View,
  Text,
  ActivityIndicator,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import { Feather } from "@expo/vector-icons";
import { reportMember } from "@/lib/member"; // ✅ NEW import

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

export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams();
  const { theme } = useAppTheme();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  // ✅ NEW: report UI state
  const [menuOpen, setMenuOpen] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [otherText, setOtherText] = useState("");

  const myUid = auth.currentUser?.uid;
  const isMe = myUid && String(uid) === myUid;

  useEffect(() => {
    if (!uid) return;

    const load = async () => {
      const snap = await getDoc(doc(db, "members", String(uid)));
      if (snap.exists()) setProfile(snap.data() as MemberProfile);
      else setProfile({ fullName: "Unknown Member" });

      const q = query(collection(db, "posts"), where("authorId", "==", String(uid)));
      const docsSnap = await getDocs(q);

      const items: Post[] = docsSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

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
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  }

  const REPORT_REASONS = [
    { label: "Fake account", reason: "fake_account" },
    { label: "Impersonating me", reason: "impersonation_me" },
    { label: "Impersonating my friend", reason: "impersonation_friend" },
    { label: "Cussing / abusive comments", reason: "abusive_language" },
    { label: "Harassment / bullying", reason: "harassment" },
    { label: "Spam", reason: "spam" },
    { label: "Scam / fraud", reason: "scam" },
    { label: "Inappropriate content", reason: "inappropriate" },
    { label: "Other", reason: "other" },
  ] as const;

  const submitMemberReport = async (reason: string) => {
    try {
      await reportMember(String(uid), reason, reason === "other" ? otherText : undefined);
      setShowReport(false);
      setOtherText("");
      Alert.alert("Thanks", "Your report has been sent to the admins.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to send report.");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <TopBar />

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
              {/* ✅ NEW: top-right menu (only if not me) */}
              {!isMe && (
                <View style={{ position: "absolute", top: 10, right: 10 }}>
                  <TouchableOpacity onPress={() => setMenuOpen((p) => !p)}>
                    <Feather name="more-vertical" size={22} color={theme.text} />
                  </TouchableOpacity>

                  {menuOpen && (
                    <>
                      {/* backdrop */}
                      <TouchableOpacity
                        onPress={() => setMenuOpen(false)}
                        style={{
                          position: "absolute",
                          top: -1000,
                          left: -1000,
                          right: -1000,
                          bottom: -1000,
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          top: 28,
                          right: 0,
                          backgroundColor: theme.card,
                          borderWidth: 1,
                          borderColor: theme.border,
                          borderRadius: 10,
                          padding: 8,
                          width: 160,
                          zIndex: 999,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => {
                            setMenuOpen(false);
                            setShowReport(true);
                          }}
                          style={{ paddingVertical: 10 }}
                        >
                          <Text style={{ color: theme.text }}>Report Member</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              )}

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

            <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 12 }}>
              Posts by {profile?.fullName}
            </Text>

            {/* ✅ NEW: Report Modal */}
            <Modal
              visible={showReport}
              transparent
              animationType="fade"
              onRequestClose={() => setShowReport(false)}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: "86%",
                    backgroundColor: theme.card,
                    borderRadius: 12,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, marginBottom: 8 }}>
                    Report Member
                  </Text>

                  <Text style={{ color: theme.placeholder, marginBottom: 12 }}>
                    Why are you reporting this member?
                  </Text>

                  {REPORT_REASONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.reason}
                      onPress={() => {
                        if (opt.reason === "other") return; // show input first
                        submitMemberReport(opt.reason);
                      }}
                      style={{ paddingVertical: 10 }}
                    >
                      <Text style={{ color: theme.text }}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}

                  {/* Other text input */}
                  <View
                    style={{
                      borderTopWidth: 1,
                      borderTopColor: theme.border,
                      marginTop: 8,
                      paddingTop: 10,
                    }}
                  >
                    <Text style={{ color: theme.placeholder, marginBottom: 6 }}>
                      If "Other", tell us more:
                    </Text>

                    <TextInput
                      value={otherText}
                      onChangeText={setOtherText}
                      placeholder="Write details..."
                      placeholderTextColor={theme.placeholder}
                      style={{
                        borderWidth: 1,
                        borderColor: theme.border,
                        borderRadius: 10,
                        padding: 10,
                        backgroundColor: theme.inputBg,
                        color: theme.text,
                        minHeight: 70,
                      }}
                      multiline
                    />

                    <TouchableOpacity
                      onPress={() => submitMemberReport("other")}
                      disabled={!otherText.trim()}
                      style={{
                        marginTop: 10,
                        backgroundColor: theme.primary,
                        padding: 12,
                        borderRadius: 10,
                        opacity: otherText.trim() ? 1 : 0.5,
                      }}
                    >
                      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
                        Submit Report
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => {
                        setShowReport(false);
                        setOtherText("");
                      }}
                      style={{ paddingVertical: 12 }}
                    >
                      <Text style={{ color: "red", fontWeight: "600", textAlign: "center" }}>
                        Cancel
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
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
    </SafeAreaView>
  );
}
