// app/admin/members.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import { Link } from "expo-router";
import { AdminTopBar } from "@/components/AdminTopBar";
import { useAppTheme } from "@/lib/theme";

import {
  searchMembers,
  restrictMember,
  unrestrictMember,
  assignRole,
} from "@/lib/adminMembers";

export default function AdminMembersScreen() {
  const { theme } = useAppTheme();

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  async function onSearch() {
    setLoading(true);
    const res = await searchMembers(search.trim());
    setResults(res);
    setLoading(false);
  }

  async function onRestrict(user: any) {
    setLoading(true);
    await restrictMember(user.id);
    await onSearch();
  }

  async function onUnrestrict(user: any) {
    setLoading(true);
    await unrestrictMember(user.id);
    await onSearch();
  }

    async function onAssignAdmin(user: any) {
      setLoading(true);

      // if user is admin → make them member
      // if user is member (or anything else) → make them admin
      const nextRole = user.role === "admin" ? "member" : "admin";

      await assignRole(user.id, nextRole);
      await onSearch();
    }


  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}>
      
      {/* ⭐ ADMIN TOP BAR ⭐ */}
      <AdminTopBar title="Members" />

      {/* ⭐ PAGE BODY ⭐ */}
      <View style={{ padding: 16 }}>

        {/* SEARCH BAR */}
        <View>
          <TextInput
            placeholder="Search by name, email or phone"
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
            style={{
              backgroundColor: theme.card,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderWidth: 1,
              borderColor: theme.border,
              color: theme.text,
              marginBottom: 10,
            }}
          />

          <TouchableOpacity
            onPress={onSearch}
            style={{
              backgroundColor: theme.primary,
              paddingVertical: 10,
              borderRadius: 10,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
              Search
            </Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={{ marginTop: 20, alignItems: "center" }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}

        {/* ⭐ SEARCH RESULTS ⭐ */}
        <View style={{ marginTop: 20 }}>
          {results.map((user) => (
            
                <Link
                key={user.id}
                href={{
                    pathname: "/admin/member/[uid]",
                    params: { uid: user.id },
                }}
                asChild
                >

              <TouchableOpacity
                activeOpacity={0.8}
                style={{
                  padding: 14,
                  marginBottom: 12,
                  backgroundColor: theme.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                
                {/* USER INFO */}
                <Text
                  style={{
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: "700",
                  }}
                >
                  {user.fullName}
                </Text>

                <Text style={{ color: theme.placeholder, marginTop: 4 }}>
                  {user.email}
                </Text>

                <Text style={{ color: theme.placeholder }}>
                  {user.phone}
                </Text>

                <Text style={{ color: theme.placeholder }}>
                  Role: {user.role}
                </Text>

                <Text style={{ color: theme.placeholder }}>
                  Status: {user.status}
                </Text>

                {/* ACTION BUTTONS */}
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 12,
                    justifyContent: "space-between",
                  }}
                >
                  {user.status === "restricted" ? (
                    <TouchableOpacity
                      onPress={() => onUnrestrict(user)}
                      style={{
                        backgroundColor: "#10b981",
                        padding: 10,
                        borderRadius: 8,
                        width: "48%",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Unrestrict
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => onRestrict(user)}
                      style={{
                        backgroundColor: "#ef4444",
                        padding: 10,
                        borderRadius: 8,
                        width: "48%",
                        alignItems: "center",
                      }}
                    >
                      <Text style={{ color: "#fff", fontWeight: "600" }}>
                        Restrict
                      </Text>
                    </TouchableOpacity>
                  )}

<TouchableOpacity
  onPress={() => onAssignAdmin(user)}
  style={{
    backgroundColor: user.role === "admin" ? "#6b7280" : "#3b82f6", // gray if demoting, blue if promoting
    padding: 10,
    borderRadius: 8,
    width: "48%",
    alignItems: "center",
  }}
>
  <Text style={{ color: "#fff", fontWeight: "600" }}>
    {user.role === "admin" ? "Make Member" : "Make Admin"}
  </Text>
</TouchableOpacity>

                </View>

              </TouchableOpacity>
            </Link>
          ))}

          {results.length === 0 && !loading && search.length > 0 && (
            <Text style={{ color: theme.placeholder, marginTop: 20 }}>
              No users found.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
