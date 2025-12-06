// app/member/friends/friends.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { TopBar } from "@/components/TopBar";

import { useAppTheme } from "@/lib/theme";
import { Friend, FriendRequest } from "@/types/friends";
import {
  listenFriends,
  listenIncomingFriendRequests,
  listenOutgoingFriendRequests,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
} from "@/lib/friends";

import { searchMembersByName, MemberSummary, getMemberProfile } from "@/lib/member";
import { auth } from "@/lib/firebase";

import { Ionicons } from "@expo/vector-icons";

type Tab = "friends" | "requests" | "search";

// 🔥 profile cache
const profileCache: Record<string, { fullName: string; city?: string; state?: string } | null> = {};

async function resolveProfile(uid: string) {
  if (profileCache[uid]) return profileCache[uid];

  const profile = await getMemberProfile(uid);
  if (!profile) {
    const fallback = { fullName: "Unknown User" };
    profileCache[uid] = fallback;
    return fallback;
  }

  const data = {
    fullName: profile.fullName ?? "Unknown User",
    city: profile.city,
    state: profile.state,
  };

  profileCache[uid] = data;
  return data;
}

export default function FriendsScreen() {
  const { theme } = useAppTheme();
  const me = auth.currentUser;

  const [tab, setTab] = useState<Tab>("friends");

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MemberSummary[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [incomingNames, setIncomingNames] = useState<Record<string, string>>({});
  const [outgoingNames, setOutgoingNames] = useState<Record<string, string>>({});

  /* ---------------- LISTENERS ---------------- */
  useEffect(() => {
    if (!me) return;

    const unsubFriends = listenFriends(setFriends);

    const unsubIncoming = listenIncomingFriendRequests(async (reqs) => {
      setIncoming(reqs);

      const map: Record<string, string> = {};
      for (const r of reqs) {
        const p = await resolveProfile(r.fromUid);
        map[r.id] = p.fullName;
      }
      setIncomingNames(map);
    });

    const unsubOutgoing = listenOutgoingFriendRequests(async (reqs) => {
      setOutgoing(reqs);

      const map: Record<string, string> = {};
      for (const r of reqs) {
        const p = await resolveProfile(r.toUid);
        map[r.id] = p.fullName;
      }
      setOutgoingNames(map);
    });

    return () => {
      unsubFriends?.();
      unsubIncoming?.();
      unsubOutgoing?.();
    };
  }, [me]);

  /* ---------------- SETS ---------------- */
  const friendsSet = useMemo(() => new Set(friends.map((f) => f.friendUid)), [friends]);
  const outgoingSet = useMemo(() => new Set(outgoing.map((r) => r.toUid)), [outgoing]);
  const incomingSet = useMemo(() => new Set(incoming.map((r) => r.fromUid)), [incoming]);

  /* ---------------- ACTIONS ---------------- */
  async function handleSearch() {
    try {
      setSearchLoading(true);
      const results = await searchMembersByName(searchTerm.trim());
      setSearchResults(results.filter((m) => m.uid !== me?.uid));
    } finally {
      setSearchLoading(false);
    }
  }

  const handleSendRequest = async (uid: string) => sendFriendRequest(uid);
  const handleAccept = async (id: string) => respondToFriendRequest(id, true);
  const handleDecline = async (id: string) => respondToFriendRequest(id, false);
  const handleRemove = async (uid: string) => removeFriend(uid);

  /* ---------------- UI COMPONENTS ---------------- */

  function Tabs() {
    const items: { id: Tab; label: string }[] = [
      { id: "friends", label: "Friends" },
      { id: "requests", label: "Requests" },
      { id: "search", label: "Find Friends" },
    ];

    return (
      <View
        style={{
          flexDirection: "row",
          backgroundColor: theme.card,
          borderRadius: 50,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        {items.map((t) => {
          const active = t.id === tab;
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{
                flex: 1,
                paddingVertical: 8,
                alignItems: "center",
                borderRadius: 50,
                backgroundColor: active ? theme.primary : "transparent",
              }}
            >
              <Text
                style={{
                  color: active ? "#fff" : theme.text,
                  fontWeight: "600",
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  /* ---------------- FRIENDS LIST ---------------- */
  function FriendsList() {
    if (!friends.length)
      return <Text style={{ color: theme.muted }}>You have no friends yet.</Text>;

    return (
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View>
              <Text style={{ color: theme.text, fontWeight: "600" }}>
                {item.friendName}
              </Text>
              {item.friendCity && (
                <Text style={{ color: theme.muted }}>
                  {item.friendCity}
                  {item.friendState ? `, ${item.friendState}` : ""}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => handleRemove(item.friendUid)}
              style={{
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: "#ef4444",
                borderRadius: 8,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600" }}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    );
  }

  /* ---------------- REQUESTS ---------------- */
  function Requests() {
    return (
      <View>
        <Text style={{ color: theme.text, fontWeight: "700", marginBottom: 8 }}>
          Incoming
        </Text>

        {!incoming.length && (
          <Text style={{ color: theme.muted, marginBottom: 12 }}>
            No incoming requests.
          </Text>
        )}

        {incoming.map((req) => (
          <View
            key={req.id}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ color: theme.text }}>
              {incomingNames[req.id] ?? "Loading..."} sent you a request
            </Text>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity
                onPress={() => handleAccept(req.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: theme.primary,
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>Accept</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleDecline(req.id)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  backgroundColor: "#ef4444",
                  borderRadius: 8,
                }}
              >
                <Text style={{ color: "#fff" }}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Text style={{ color: theme.text, fontWeight: "700", marginTop: 16 }}>
          Outgoing
        </Text>

        {!outgoing.length && (
          <Text style={{ color: theme.muted }}>No outgoing requests.</Text>
        )}

        {outgoing.map((req) => (
          <View
            key={req.id}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text }}>
              Pending request to {outgoingNames[req.id] ?? "Loading..."}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  /* ---------------- SEARCH ---------------- */
  function Search() {
    return (
      <View>
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
          <TextInput
            placeholder="Search by name"
            placeholderTextColor={theme.muted}
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={{
              flex: 1,
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 12,
              color: theme.text,
            }}
          />
          <TouchableOpacity
            onPress={handleSearch}
            style={{
              backgroundColor: theme.primary,
              paddingHorizontal: 20,
              justifyContent: "center",
              borderRadius: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600" }}>
              {searchLoading ? "..." : "Search"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Results */}
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => {
            const isFriend = friendsSet.has(item.uid);
            const isOutgoing = outgoingSet.has(item.uid);
            const isIncoming = incomingSet.has(item.uid);

            let label = "Add Friend";
            let disabled = false;

            if (isFriend) {
              label = "Friends";
              disabled = true;
            } else if (isOutgoing) {
              label = "Pending";
              disabled = true;
            } else if (isIncoming) {
              label = "Respond in Requests";
              disabled = true;
            }

            return (
              <View
                style={{
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderColor: theme.border,
                  flexDirection: "row",
                  justifyContent: "space-between",
                }}
              >
                <View>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>
                    {item.fullName}
                  </Text>
                  {item.city && (
                    <Text style={{ color: theme.muted }}>
                      {item.city}
                      {item.state ? `, ${item.state}` : ""}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  disabled={disabled}
                  onPress={() => handleSendRequest(item.uid)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    backgroundColor: disabled ? theme.border : theme.primary,
                    borderRadius: 10,
                  }}
                >
                  <Text
                    style={{
                      color: disabled ? theme.text : "#fff",
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            searchTerm !== "" && !searchLoading ? (
              <Text style={{ color: theme.muted }}>
                No members found for "{searchTerm}"
              </Text>
            ) : null
          }
        />
      </View>
    );
  }

  /* ---------------- MAIN RENDER ---------------- */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
      <TopBar />

      <View style={{ flex: 1, padding: 16 }}>
        <Text
          style={{
            color: theme.text,
            fontSize: 24,
            fontWeight: "700",
            marginBottom: 12,
          }}
        >
          Friends
        </Text>

        <Tabs />

        {tab === "friends" && <FriendsList />}
        {tab === "requests" && <Requests />}
        {tab === "search" && <Search />}
      </View>
    </SafeAreaView>
  );
}
