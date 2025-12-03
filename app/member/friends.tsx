// app/member/friends/friends.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    FlatList,
    TouchableOpacity,
} from "react-native";

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
import { searchMembersByName, MemberSummary } from "@/lib/member";
import { auth } from "@/lib/firebase";
import { getMemberProfile } from "@/lib/member";

type Tab = "friends" | "requests" | "search";

// Small profile cache to avoid repeat Firestore reads
const profileCache: Record<
    string,
    { fullName: string; city?: string; state?: string } | null
> = {};

async function resolveProfile(uid: string): Promise<{
    fullName: string;
    city?: string;
    state?: string;
}> {
    if (profileCache[uid]) return profileCache[uid];

    const profile = await getMemberProfile(uid);

    if (!profile) {
        // Cache fallback
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
    const [tab, setTab] = useState<Tab>("friends");

    const [friends, setFriends] = useState<Friend[]>([]);
    const [incoming, setIncoming] = useState<FriendRequest[]>([]);
    const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);

    const [searchTerm, setSearchTerm] = useState("");
    const [searchResults, setSearchResults] = useState<MemberSummary[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);

    const [incomingNames, setIncomingNames] = useState<Record<string, string>>({});
    const [outgoingNames, setOutgoingNames] = useState<Record<string, string>>({});

    const me = auth.currentUser;

    // --- Listeners -----------------------------------------------------

    useEffect(() => {
        if (!me) return;

        const unsubFriends = listenFriends(setFriends);
        const unsubIncoming = listenIncomingFriendRequests(async (reqs) => {
            setIncoming(reqs);

            // fetch names for all senders
            const nameMap: Record<string, string> = {};
            for (const r of reqs) {
                const p = await resolveProfile(r.fromUid);
                nameMap[r.id] = p.fullName;
            }
            setIncomingNames(nameMap);
        });

        const unsubOutgoing = listenOutgoingFriendRequests(async (reqs) => {
            setOutgoing(reqs);

            const nameMap: Record<string, string> = {};
            for (const r of reqs) {
                const p = await resolveProfile(r.toUid);
                nameMap[r.id] = p.fullName;
            }
            setOutgoingNames(nameMap);
        });

        return () => {
            unsubFriends?.();
            unsubIncoming?.();
            unsubOutgoing?.();
        };
    }, [me]);

    // --- Sets to detect status in search results -----------------------

    const friendsSet = useMemo(
        () => new Set(friends.map((f) => f.friendUid)),
        [friends]
    );
    const outgoingSet = useMemo(
        () => new Set(outgoing.map((r) => r.toUid)),
        [outgoing]
    );
    const incomingSet = useMemo(
        () => new Set(incoming.map((r) => r.fromUid)),
        [incoming]
    );

    // --- Actions --------------------------------------------------------

    async function handleSearch() {
        try {
            setSearchLoading(true);
            const results = await searchMembersByName(searchTerm.trim());
            setSearchResults(results.filter((m) => m.uid !== me?.uid));
        } catch (e) {
            console.error(e);
        } finally {
            setSearchLoading(false);
        }
    }

    async function handleSendRequest(uid: string) {
        try {
            await sendFriendRequest(uid);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleAccept(id: string) {
        try {
            await respondToFriendRequest(id, true);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleDecline(id: string) {
        try {
            await respondToFriendRequest(id, false);
        } catch (err) {
            console.error(err);
        }
    }

    async function handleRemove(uid: string) {
        try {
            await removeFriend(uid);
        } catch (err) {
            console.error(err);
        }
    }

    // -------------------------------------------------------------------
    //  Rendering helpers
    // -------------------------------------------------------------------

    function renderTabs() {
        const tabs: { id: Tab; label: string }[] = [
            { id: "friends", label: "Friends" },
            { id: "requests", label: "Requests" },
            { id: "search", label: "Find Friends" },
        ];

        return (
            <View
                style={{
                    flexDirection: "row",
                    marginBottom: 12,
                    backgroundColor: theme.chipBg,
                    borderRadius: 999,
                    padding: 4,
                }}
            >
                {tabs.map((t) => {
                    const active = t.id === tab;
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={{
                                flex: 1,
                                paddingVertical: 8,
                                borderRadius: 999,
                                alignItems: "center",
                                backgroundColor: active ? theme.primary : "transparent",
                            }}
                            onPress={() => setTab(t.id)}
                        >
                            <Text
                                style={{
                                    color: active ? theme.buttonText : theme.text,
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

    function renderFriends() {
        if (!friends.length) {
            return <Text style={{ color: theme.text }}>You have no friends yet.</Text>;
        }

        return (
            <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <View
                        style={{
                            paddingVertical: 10,
                            borderBottomWidth: 1,
                            borderColor: theme.border,
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <View>
                            <Text style={{ color: theme.text, fontWeight: "600" }}>
                                {item.friendName || "Member"}
                            </Text>
                            {!!item.friendCity && (
                                <Text style={{ color: theme.muted }}>
                                    {item.friendCity}
                                    {item.friendState ? `, ${item.friendState}` : ""}
                                </Text>
                            )}
                        </View>
                        <Button title="Remove" onPress={() => handleRemove(item.friendUid)} />
                    </View>
                )}
            />
        );
    }

    function renderRequests() {
        return (
            <View>
                <Text style={{ color: theme.text, fontWeight: "700", marginBottom: 8 }}>
                    Incoming
                </Text>

                {incoming.length === 0 && (
                    <Text style={{ color: theme.muted, marginBottom: 16 }}>
                        No incoming requests.
                    </Text>
                )}

                {incoming.map((req) => (
                    <View
                        key={req.id}
                        style={{
                            paddingVertical: 10,
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
                            <Button title="Accept" onPress={() => handleAccept(req.id)} />
                            <Button title="Decline" onPress={() => handleDecline(req.id)} />
                        </View>
                    </View>
                ))}

                <Text
                    style={{
                        color: theme.text,
                        fontWeight: "700",
                        marginTop: 16,
                        marginBottom: 8,
                    }}
                >
                    Outgoing
                </Text>

                {outgoing.length === 0 && (
                    <Text style={{ color: theme.muted }}>No pending outgoing requests.</Text>
                )}

                {outgoing.map((req) => (
                    <View
                        key={req.id}
                        style={{
                            paddingVertical: 10,
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

    function renderSearch() {
        return (
            <View>
                <View style={{ flexDirection: "row", marginBottom: 12, gap: 8 }}>
                    <TextInput
                        placeholder="Search by name"
                        placeholderTextColor={theme.muted}
                        value={searchTerm}
                        onChangeText={setSearchTerm}
                        style={{
                            flex: 1,
                            borderWidth: 1,
                            borderColor: theme.border,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 8,
                            color: theme.text,
                        }}
                    />
                    <Button
                        title={searchLoading ? "..." : "Search"}
                        onPress={handleSearch}
                    />
                </View>

                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.uid}
                    renderItem={({ item }) => {
                        const isFriend = friendsSet.has(item.uid);
                        const isOutgoing = outgoingSet.has(item.uid);
                        const isIncoming = incomingSet.has(item.uid);

                        let buttonTitle = "Add";
                        let disabled = false;

                        if (isFriend) {
                            buttonTitle = "Friends";
                            disabled = true;
                        } else if (isOutgoing) {
                            buttonTitle = "Pending";
                            disabled = true;
                        } else if (isIncoming) {
                            buttonTitle = "Respond in Requests";
                            disabled = true;
                        }

                        return (
                            <View
                                style={{
                                    paddingVertical: 10,
                                    borderBottomWidth: 1,
                                    borderColor: theme.border,
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <View>
                                    <Text style={{ color: theme.text, fontWeight: "600" }}>
                                        {item.fullName}
                                    </Text>
                                    {!!item.city && (
                                        <Text style={{ color: theme.muted }}>
                                            {item.city}
                                            {item.state ? `, ${item.state}` : ""}
                                        </Text>
                                    )}
                                </View>
                                <Button
                                    title={buttonTitle}
                                    disabled={disabled}
                                    onPress={() => handleSendRequest(item.uid)}
                                />
                            </View>
                        );
                    }}
                    ListEmptyComponent={
                        searchTerm ? (
                            <Text style={{ color: theme.muted }}>
                                No members found for “{searchTerm}”.
                            </Text>
                        ) : null
                    }
                />
            </View>
        );
    }

    // -------------------------------------------------------------------

    return (
        <View
            style={{
                flex: 1,
                backgroundColor: theme.background,
                padding: 16,
            }}
        >
            <Text
                style={{
                    color: theme.text,
                    fontSize: 22,
                    fontWeight: "700",
                    marginBottom: 12,
                }}
            >
                Friends
            </Text>

            {renderTabs()}

            {tab === "friends" && renderFriends()}
            {tab === "requests" && renderRequests()}
            {tab === "search" && renderSearch()}
        </View>
    );
}
