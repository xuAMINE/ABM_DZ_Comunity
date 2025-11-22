// app/components/TopBar.tsx
import { View, Text, TouchableOpacity } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useAppTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";

export function TopBar() {
  const nav = useNavigation();
  const { theme } = useAppTheme();

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

      {/* Right icons */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        {/* Notification */}
        <TouchableOpacity activeOpacity={0.7}>
          <Feather name="bell" size={22} color={theme.text} />
        </TouchableOpacity>

        {/* Avatar */}
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
