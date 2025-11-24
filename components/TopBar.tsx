// app/components/TopBar.tsx
import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useAppTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";
import { listenUnreadNotifications } from "@/lib/notifications";

export function TopBar() {
  const nav = useNavigation();
  const { theme } = useAppTheme();

  const [unreadCount, setUnreadCount] = useState(0);

  // Real-time unread notifications count listener
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const unsub = listenUnreadNotifications(uid, (count) => {
      setUnreadCount(count);
    });

    return unsub;
  }, []);

  const name =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "M";

  const initial = (name[0] || "M").toUpperCase();

  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: theme.border,
        backgroundColor: theme.bg,
      }}
    >
      {/* MENU BUTTON */}
      <TouchableOpacity
        onPress={() => (nav as any).dispatch(DrawerActions.openDrawer())}
        activeOpacity={0.7}
      >
        <Feather name="menu" size={22} color={theme.text} />
      </TouchableOpacity>

      {/* TITLE */}
      <Text style={{ fontWeight: "800", fontSize: 18, color: theme.text }}>
        DZ Community
      </Text>

      {/* RIGHT SIDE */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>

        {/* 🔔 NOTIFICATION BELL WITH UNREAD COUNT */}
        <Link href="/member/notifications" asChild>
          <TouchableOpacity activeOpacity={0.7} style={{ position: "relative" }}>
            <Feather name="bell" size={22} color={theme.text} />

            {unreadCount > 0 && (
              <View
                style={{
                  position: "absolute",
                  top: -6,
                  right: -10,
                  minWidth: 18,
                  height: 18,
                  paddingHorizontal: 4,
                  backgroundColor: "#ef4444",
                  borderRadius: 9,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  {unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </Link>

        {/* AVATAR */}
        <Link href="/member/profile" asChild>
          <TouchableOpacity activeOpacity={0.7}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>
                {initial}
              </Text>
            </View>
          </TouchableOpacity>
        </Link>

      </View>
    </View>
  );
}
