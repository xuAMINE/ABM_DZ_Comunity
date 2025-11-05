import { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { auth } from "@/lib/firebaseConfig";
import { logout, getMyProfile } from "@/lib/auth";
import { scheduleCheckIn } from "@/lib/checkIn";
import { CheckInModal } from "@/components/CheckInModal";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export default function HomeScreen() {
  const [name, setName] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (uid) {
      getMyProfile(uid).then((p) => setName((p as any)?.fullName ?? null));

      const setupNotifications = async () => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== "granted") {
          console.warn("Notifications permission not granted");
          return;
        }

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
            shouldShowBanner: true, // ✅ new fields for SDK 52+
            shouldShowList: true,   // ✅ required by new NotificationBehavior
          }),
        });

        await scheduleCheckIn(uid);

        // Show modal on first login (optional)
        setTimeout(() => setShowCheckIn(true), 2000);
      };

      setupNotifications();
    }
  }, []);

  return (
      <View style={s.container}>
        <Text style={s.title}>Welcome {name ?? auth.currentUser?.email}</Text>

        <TouchableOpacity style={s.btn} onPress={logout}>
          <Text style={s.btnTxt}>Log out</Text>
        </TouchableOpacity>

        <CheckInModal
            visible={showCheckIn}
            userId={auth.currentUser?.uid!}
            onClose={() => setShowCheckIn(false)}
        />
      </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 22, fontWeight: "600", marginBottom: 20 },
  btn: { backgroundColor: "#ef4444", padding: 14, borderRadius: 8 },
  btnTxt: { color: "#fff", fontWeight: "600" },
});
