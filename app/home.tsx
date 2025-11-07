// app/home.tsx
import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  FlatList,
  Alert,
} from "react-native";
import * as Notifications from "expo-notifications";
import { auth, db } from "@/lib/firebaseConfig";
import { logout, getMyProfile } from "@/lib/auth";
import { scheduleCheckIn } from "@/lib/checkIn";
import { CheckInModal } from "@/components/CheckInModal";
import {
  searchMembersByName,
  sendFriendRequestToUid,
  acceptFriendRequest,
} from "@/lib/friends";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  orderBy,
  query as fsQuery,
} from "firebase/firestore";
import debounce from "lodash.debounce";

type FriendRequest = {
  id: string;        // sender UID (doc id)
  fromUid: string;   // sender UID
  senderName: string;
  createdAt?: any;
};

export default function HomeScreen() {
  const [name, setName] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Requests state
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  // Load profile + notifications + scheduled check-in prompt
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getMyProfile(uid)
        .then((p) => setName((p as any)?.fullName ?? null))
        .catch(() => setName(null));

    const setupNotifications = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn("Notifications permission not granted");
        }

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        // Kick off any scheduled check-in logic (no-op if already scheduled)
        await scheduleCheckIn(uid);

        // Optional: show first-time check-in modal
        setTimeout(() => setShowCheckIn(true), 1200);
      } catch (e) {
        console.warn("Notification setup error:", e);
      }
    };

    setupNotifications();
  }, []);

  // Listen for incoming friend requests and enrich with sender names
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // If you prefer sorted by newest:
    const q = fsQuery(
        collection(db, "members", uid, "friendRequests"),
        orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
      }));

      const enriched = await Promise.all(
          raw.map(async (req) => {
            try {
              const senderSnap = await getDoc(doc(db, "members", req.fromUid));
              const senderData = senderSnap.exists() ? senderSnap.data() : null;
              return {
                ...req,
                senderName: senderData?.fullName || req.fromUid,
              } as FriendRequest;
            } catch {
              return { ...req, senderName: req.fromUid } as FriendRequest;
            }
          })
      );

      setRequests(enriched);
    });

    return unsub;
  }, []);

  // Debounced search by name (prefix)
  const doSearch = useMemo(
      () =>
          debounce(async (text: string) => {
            const term = text.trim();
            if (term.length < 2) {
              setResults([]);
              setLoadingSearch(false);
              return;
            }
            try {
              setLoadingSearch(true);
              const hits = await searchMembersByName(term, 8);
              const me = auth.currentUser?.uid;
              setResults(hits.filter((u: any) => u.uid !== me));
            } catch (e: any) {
              console.warn("search error", e?.message || e);
              setResults([]);
              Alert.alert(
                  "Search error",
                  "Couldn’t search users. Check Firestore rules and that profiles have fullNameLower."
              );
            } finally {
              setLoadingSearch(false);
            }
          }, 300),
      []
  );

  useEffect(() => {
    doSearch(query);
    return () => doSearch.cancel();
  }, [query, doSearch]);

  // Send request to selected user; verify it landed; show confirmation
  const onSendTo = async (targetUid: string) => {
    if (!auth.currentUser?.uid) {
      Alert.alert("Not signed in");
      return;
    }
    try {
      setSendingTo(targetUid);
      await sendFriendRequestToUid(targetUid);

      // Verify the request actually exists under the RECIPIENT
      const senderUid = auth.currentUser.uid;
      const verify = await getDoc(
          doc(db, "members", targetUid, "friendRequests", senderUid)
      );

      if (verify.exists()) {
        Alert.alert("Request sent!", "Your friend request was delivered.");
      } else {
        Alert.alert(
            "Warning",
            "Write returned OK, but the friend request wasn't found on the recipient."
        );
      }
    } catch (e: any) {
      Alert.alert("Info", e?.message ?? "Could not send request.");
    } finally {
      setSendingTo(null);
    }
  };

  const onAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      Alert.alert("Added", "Friend request accepted!");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to accept request.");
    }
  };

  const uid = auth.currentUser?.uid;

  return (
      <View style={s.container}>
        <Text style={s.title}>Welcome {name ?? auth.currentUser?.email}</Text>

        {/* Search by name */}
        <View style={s.row}>
          <TextInput
              placeholder="Search friends by name"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="words"
              style={s.input}
          />
        </View>

        {query.length > 0 && (
            <View style={{ alignSelf: "stretch", gap: 8 }}>
              <Text style={s.sectionTitle}>
                {loadingSearch ? "Searching..." : "Results"}
              </Text>

              {results.length === 0 ? (
                  <Text style={s.muted}>No users found.</Text>
              ) : (
                  <FlatList
                      data={results}
                      keyExtractor={(u) => u.uid}
                      ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                      renderItem={({ item }) => (
                          <View style={s.reqItem}>
                            <View>
                              <Text style={s.reqText}>{item.fullName}</Text>
                              {!!item.email && (
                                  <Text style={s.mutedSmall}>{item.email}</Text>
                              )}
                            </View>
                            <TouchableOpacity
                                style={[
                                  s.primaryBtn,
                                  sendingTo === item.uid && { opacity: 0.6 },
                                ]}
                                disabled={sendingTo === item.uid}
                                onPress={() => onSendTo(item.uid)}
                            >
                              <Text style={s.btnTxt}>
                                {sendingTo === item.uid ? "Sending..." : "Send request"}
                              </Text>
                            </TouchableOpacity>
                          </View>
                      )}
                  />
              )}
            </View>
        )}

        {/* Incoming Friend Requests */}
        <Text style={s.sectionTitle}>Friend requests</Text>
        {requests.length === 0 ? (
            <Text style={s.muted}>No pending requests</Text>
        ) : (
            <FlatList
                data={requests}
                keyExtractor={(item) => item.id}
                style={{ alignSelf: "stretch" }}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                    <View style={s.reqItem}>
                      <Text style={s.reqText}>From: {item.senderName}</Text>
                      <TouchableOpacity
                          style={s.acceptBtn}
                          onPress={() => onAccept(item.id)}
                      >
                        <Text style={s.acceptTxt}>Accept</Text>
                      </TouchableOpacity>
                    </View>
                )}
            />
        )}

        {/* Logout */}
        <TouchableOpacity style={[s.btn, s.logout]} onPress={logout}>
          <Text style={s.btnTxt}>Log out</Text>
        </TouchableOpacity>

        {/* Check-in Modal */}
        {uid ? (
            <CheckInModal
                visible={showCheckIn}
                userId={uid}
                onClose={() => setShowCheckIn(false)}
            />
        ) : null}
      </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: "600", marginTop: 12 },

  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },

  primaryBtn: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btn: { padding: 14, borderRadius: 8, alignItems: "center" },
  logout: { backgroundColor: "#ef4444", marginTop: "auto" },
  btnTxt: { color: "#fff", fontWeight: "600" },

  sectionTitle: { fontSize: 16, fontWeight: "600", marginTop: 8 },
  muted: { color: "#6b7280" },
  mutedSmall: { color: "#9ca3af", fontSize: 12 },

  reqItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reqText: { fontSize: 14 },
  acceptBtn: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptTxt: { color: "#fff", fontWeight: "600" },
});
