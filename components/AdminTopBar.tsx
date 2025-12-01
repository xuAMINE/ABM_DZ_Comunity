// app/components/AdminTopBar.tsx

import { View, Text, TouchableOpacity } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/lib/theme";
import { auth } from "@/lib/firebase";
// import { listenUnreadNotifications } from "@/lib/notifications"; // optional

type Props = {
  title?: string;
};

export function AdminTopBar({ title = "Admin Panel" }: Props) {
  const nav = useNavigation();
  const { theme } = useAppTheme();

  // Admin name + initial
  const adminName =
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "Admin";

  const initial = (adminName[0] || "A").toUpperCase();

  // OPTIONAL unread notifications
  // const [unreadCount, setUnreadCount] = useState(0);
  //
  // useEffect(() => {
  //   const uid = auth.currentUser?.uid;
  //   if (!uid) return;
  //   const unsub = listenUnreadNotifications(uid, setUnreadCount);
  //   return unsub;
  // }, []);

  return (
    <SafeAreaView
      edges={["top"]}
      style={{
        backgroundColor: theme.bg,
      }}
    >
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
        {/* MENU BUTTON */}
        <TouchableOpacity
          onPress={() => (nav as any).dispatch(DrawerActions.openDrawer())}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={22} color={theme.text} />
        </TouchableOpacity>

        {/* TITLE */}
        <Text
          style={{
            fontWeight: "800",
            fontSize: 18,
            color: theme.text,
          }}
        >
          {title}
        </Text>

        {/* RIGHT SIDE ICONS */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
          {/* NOTIFICATION ICON */}
          <TouchableOpacity activeOpacity={0.7}>
            <View style={{ position: "relative" }}>
              <Feather name="bell" size={22} color={theme.text} />

              {/* ENABLE WHEN USING NOTIFICATION SYSTEM */}
              {/* {unreadCount > 0 && (
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
              )} */}
            </View>
          </TouchableOpacity>

          {/* AVATAR */}
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
