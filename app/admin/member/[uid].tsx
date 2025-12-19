// app/admin/member/[uid].tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";
import { db } from "@/lib/firebase";

import {
  doc,
  getDoc,
  getDocs,
  collection,
  where,
  query,
} from "firebase/firestore";

import { restrictMember, unrestrictMember } from "@/lib/adminMembers";
import { dismissAdminReport, actionAdminReport } from "@/lib/adminNotifications";

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

export default function AdminViewUserProfile() {
  const { uid } = useLocalSearchParams();
  const { theme } = useAppTheme();

  const memberUid = String(uid || "");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [report, setReport] = useState<any | null>(null); // ✅ member report inbox doc

  const reportDocId = useMemo(() => `member_${memberUid}`, [memberUid]);

  useEffect(() => {
    if (!memberUid) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberUid]);

  async function load() {
    setLoading(true);

    try {
      // Fetch profile
      const snap = await getDoc(doc(db, "members", memberUid));
      setProfile(snap.exists() ? (snap.data() as MemberProfile) : null);

      // Fetch posts
      const q = query(collection(db, "posts"), where("authorId", "==", memberUid));
      const docsSnap = await getDocs(q);
      const items: Post[] = docsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

      items.sort((a, b) => {
        const ta = a.createdAt?.toMillis?.() ?? 0;
        const tb = b.createdAt?.toMillis?.() ?? 0;
        return tb - ta;
      });

      setPosts(items);

      // ✅ Fetch member report inbox doc (admins can read)
      const repSnap = await getDoc(doc(db, "adminReports", reportDocId));
      setReport(repSnap.exists() ? ({ id: repSnap.id, ...(repSnap.data() as any) }) : null);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  const isRestricted = String(profile?.status || "").toLowerCase() === "restricted";

  const reportersList = useMemo(() => {
    const reps = report?.reporters ?? {};
    return Object.values(reps) as any[];
  }, [report]);

  const reasonCounts = useMemo(() => {
    const rc = report?.reasonCounts ?? {};
    const arr = Object.entries(rc).map(([reason, count]) => ({
      reason,
      count: Number(count) || 0,
    }));
    arr.sort((a, b) => b.count - a.count);
    return arr;
  }, [report]);

  const statusBadge = (status?: string) => {
    const s = String(status || "open");
    const bg =
      s === "open" ? "#f59e0b" :
      s === "dismissed" ? "#6b7280" :
      s === "actioned" ? "#10b981" :
      "#94a3b8";

    return (
      <View
        style={{
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: bg,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>
          {s}
        </Text>
      </View>
    );
  };

  async function onRestrict() {
    if (!memberUid) return;
    setBusy(true);
    try {
      await restrictMember(memberUid);
      await load();
      Alert.alert("Done", "Member restricted.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to restrict member.");
    } finally {
      setBusy(false);
    }
  }

  async function onUnrestrict() {
    if (!memberUid) return;
    setBusy(true);
    try {
      await unrestrictMember(memberUid);
      await load();
      Alert.alert("Done", "Member unrestricted.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to unrestrict member.");
    } finally {
      setBusy(false);
    }
  }

  async function onDismissReport() {
    if (!report?.id) return;
    setBusy(true);
    try {
      await dismissAdminReport(report.id);
      await load();
      Alert.alert("Dismissed", "Report dismissed.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to dismiss report.");
    } finally {
      setBusy(false);
    }
  }

  async function onActionReport() {
    if (!report?.id) return;
    setBusy(true);
    try {
      await actionAdminReport(report.id);
      await load();
      Alert.alert("Actioned", "Report marked as actioned.");
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to mark actioned.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AdminTopBar title="User Profile" />

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
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

              {/* ✅ ACTION BUTTONS */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 14, width: "100%" }}>
                {isRestricted ? (
                  <TouchableOpacity
                    disabled={busy}
                    onPress={onUnrestrict}
                    style={{
                      flex: 1,
                      backgroundColor: "#10b981",
                      padding: 12,
                      borderRadius: 10,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
                      Unrestrict
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    disabled={busy}
                    onPress={onRestrict}
                    style={{
                      flex: 1,
                      backgroundColor: "#ef4444",
                      padding: 12,
                      borderRadius: 10,
                      opacity: busy ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
                      Restrict
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  disabled={busy}
                  onPress={load}
                  style={{
                    width: 110,
                    backgroundColor: theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                    padding: 12,
                    borderRadius: 10,
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: theme.text, textAlign: "center", fontWeight: "800" }}>
                    Refresh
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ✅ REPORTS SECTION */}
            <View
              style={{
                marginTop: 14,
                padding: 14,
                backgroundColor: theme.card,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.text, fontSize: 18, fontWeight: "900" }}>
                  Reports
                </Text>
                {statusBadge(report?.status ?? "open")}
              </View>

              {!report ? (
                <Text style={{ color: theme.placeholder, marginTop: 10 }}>
                  No reports for this member yet.
                </Text>
              ) : (
                <>
                  <Text style={{ color: theme.placeholder, marginTop: 10 }}>
                    Last report:{" "}
                    <Text style={{ color: theme.text, fontWeight: "800" }}>
                      {report.lastReporterName ?? "Member"}
                    </Text>
                    {" • "}
                    <Text style={{ color: theme.text }}>
                      {report.lastReason ?? "report"}
                    </Text>
                    {" • "}
                    <Text style={{ color: theme.placeholder }}>
                      {timeAgo(report.lastReportedAt)} ago
                    </Text>
                  </Text>

                  {/* Reason counts */}
                  {reasonCounts.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: theme.text, fontWeight: "800", marginBottom: 6 }}>
                        Reasons
                      </Text>

                      {reasonCounts.map((r) => (
                        <View
                          key={r.reason}
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                            paddingVertical: 6,
                            borderBottomWidth: 1,
                            borderBottomColor: theme.border,
                          }}
                        >
                          <Text style={{ color: theme.text }}>{r.reason}</Text>
                          <Text style={{ color: theme.placeholder, fontWeight: "900" }}>
                            {r.count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Reporter details */}
                  {reportersList.length > 0 && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={{ color: theme.text, fontWeight: "800", marginBottom: 6 }}>
                        Reporter details
                      </Text>

                      {reportersList
                        .slice()
                        .sort((a: any, b: any) => {
                          const ta = a?.updatedAt?.toMillis?.() ?? 0;
                          const tb = b?.updatedAt?.toMillis?.() ?? 0;
                          return tb - ta;
                        })
                        .map((r: any) => (
                          <View
                            key={r.reporterUid}
                            style={{
                              backgroundColor: theme.inputBg,
                              borderWidth: 1,
                              borderColor: theme.border,
                              borderRadius: 12,
                              padding: 12,
                              marginBottom: 10,
                            }}
                          >
                            <Text style={{ color: theme.text, fontWeight: "900" }}>
                              {r.reporterName ?? "Member"}
                            </Text>

                            <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                              Reason: <Text style={{ color: theme.text }}>{r.reason}</Text>
                            </Text>

                            {r.details ? (
                              <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                                Details: <Text style={{ color: theme.text }}>{String(r.details)}</Text>
                              </Text>
                            ) : null}

                            <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                              Updated: {timeAgo(r.updatedAt)} ago
                            </Text>
                          </View>
                        ))}
                    </View>
                  )}

                  {/* Report actions */}
                  <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      disabled={busy}
                      onPress={onDismissReport}
                      style={{
                        flex: 1,
                        backgroundColor: "#6b7280",
                        padding: 12,
                        borderRadius: 10,
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                        Dismiss
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      disabled={busy}
                      onPress={onActionReport}
                      style={{
                        flex: 1,
                        backgroundColor: "#10b981",
                        padding: 12,
                        borderRadius: 10,
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      <Text style={{ color: "#fff", textAlign: "center", fontWeight: "900" }}>
                        Mark Actioned
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            {/* POSTS TITLE */}
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
