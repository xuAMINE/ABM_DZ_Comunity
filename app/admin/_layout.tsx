// app/admin/_layout.tsx

import { Drawer } from "expo-router/drawer";
import { Link, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, Switch } from "react-native";
import { useAppTheme } from "@/lib/theme";
import { logout } from "@/lib/auth";

function AdminDrawerContent() {
  const router = useRouter();
  const { theme, mode, setMode, isDark } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg, paddingTop: 48 }}>

      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderBottomWidth: 1,
          borderColor: theme.border2,
        }}
      >
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "700" }}>
          Admin Panel
        </Text>
        <Text style={{ color: theme.placeholder, marginTop: 4 }}>
          Manage the Community
        </Text>
      </View>

      {/* LINKS */}
      <View style={{ padding: 16, rowGap: 12 }}>

        <Link href="/admin/dashboard" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Dashboard</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/admin/posts" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Posts Moderation</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/admin/members" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Members</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/admin/settings" asChild>
          <TouchableOpacity style={{ paddingVertical: 10 }}>
            <Text style={{ color: theme.text, fontSize: 16 }}>Admin Settings</Text>
          </TouchableOpacity>
        </Link>

      </View>

      {/* THEME MODE */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.border2,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ color: theme.text, fontSize: 16 }}>Dark mode</Text>
          <Switch
            value={isDark}
            onValueChange={(v) => setMode(v ? "dark" : "light")}
          />
        </View>

        <View
          style={{
            marginTop: 8,
            flexDirection: "row",
            justifyContent: "space-between",
          }}
        >
          <TouchableOpacity onPress={() => setMode("system")}>
            <Text
              style={{
                color: mode === "system" ? theme.primary : theme.text,
              }}
            >
              Use system
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode("light")}>
            <Text
              style={{
                color: mode === "light" ? theme.primary : theme.text,
              }}
            >
              Light
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setMode("dark")}>
            <Text
              style={{
                color: mode === "dark" ? theme.primary : theme.text,
              }}
            >
              Dark
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* LOGOUT */}
      <View style={{ padding: 16, marginTop: "auto" }}>
        <TouchableOpacity
          onPress={async () => {
            await logout();
            router.replace("/login");
          }}
          style={{
            paddingVertical: 12,
            alignItems: "center",
            borderWidth: 1,
            borderColor: theme.border,
            borderRadius: 10,
            backgroundColor: theme.card,
          }}
        >
          <Text style={{ color: theme.text, fontWeight: "600" }}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminLayout() {
  const { theme } = useAppTheme();

  return (
    <Drawer
      screenOptions={{
        headerShown: false,
        drawerStyle: { backgroundColor: theme.bg },
        sceneStyle: { backgroundColor: theme.bg },
      }}
      drawerContent={() => <AdminDrawerContent />}
    >
      <Drawer.Screen name="dashboard" />
      <Drawer.Screen name="posts/index" />
      <Drawer.Screen name="posts/[id]" />
      <Drawer.Screen name="members" />
      <Drawer.Screen name="settings" />

      {/* ✅ ADD THIS */}
      <Drawer.Screen name="member/[uid]" />

    </Drawer>
  );
}

