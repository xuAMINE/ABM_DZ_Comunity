// app/components/AdminTopBar.tsx

import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link } from "expo-router";

import { useAppTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";
import { listenOpenAdminReports } from "@/lib/adminNotifications";
import { onAuthStateChanged } from "firebase/auth";   // 👈 add this

type Props = {
  title?: string;
};

export function AdminTopBar({ title = "Admin Panel" }: Props) {
  const nav = useNavigation();
  const { theme } = useAppTheme();

  const adminName =
    auth.currentUser?.displayName || auth.currentUser?.email || "Admin";
  const initial = (adminName[0] || "A").toUpperCase();

  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let unsubReports: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      // clean up previous listener if user changes / logs out
      if (unsubReports) {
        unsubReports();
        unsubReports = undefined;
      }

      if (!user) {
        setUnreadCount(0);
        return;
      }

      const adminUid = user.uid;

      // now we KNOW we have a user → attach Firestore listener
      unsubReports = listenOpenAdminReports((items) => {
        const unread = items.filter((it) => !it?.readBy?.[adminUid]).length;
        setUnreadCount(unread);
      });
    });

    return () => {
      unsubAuth();
      if (unsubReports) unsubReports();
    };
  }, []);

  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: theme.bg }}>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        }}
      >
        <TouchableOpacity
          onPress={() => (nav as any).dispatch(DrawerActions.openDrawer())}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={22} color={theme.text} />
        </TouchableOpacity>

        <Text
          style={{
            fontWeight: "800",
            fontSize: 18,
            color: theme.text,
          }}
        >
          {title}
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          <Link href="/admin/notifications" asChild>
            <TouchableOpacity activeOpacity={0.7}>
              <View style={{ position: "relative" }}>
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
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </Link>

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
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "700",
                }}
              >
                {initial}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
