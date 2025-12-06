// app/restricted.tsx
import { View, Text, TouchableOpacity, useColorScheme } from "react-native";
import { logout } from "@/lib/auth";
import { Ionicons } from "@expo/vector-icons";

export default function RestrictedScreen() {
  const isDark = useColorScheme() === "dark";

  const colors = {
    bg: isDark ? "#0d1117" : "#f5f5f5",
    card: isDark ? "#161b22" : "#ffffff",
    text: isDark ? "#e6edf3" : "#111",
    subtle: isDark ? "#8b949e" : "#555",
    danger: "#ef4444",
    buttonBg: isDark ? "#ef4444" : "#dc2626",
    buttonText: "#fff",
    border: isDark ? "#30363d" : "#ddd",
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >

      {/* Card */}
      <View
        style={{
          width: "100%",
          maxWidth: 400,
          backgroundColor: colors.card,
          padding: 24,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          shadowColor: "#000",
          shadowOpacity: 0.1,
          shadowRadius: 10,
        }}
      >

        {/* Icon */}
        <Ionicons
          name="alert-circle"
          size={60}
          color={colors.danger}
          style={{ marginBottom: 16 }}
        />

        {/* Title */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Access Restricted
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 15,
            color: colors.subtle,
            textAlign: "center",
            marginBottom: 20,
            lineHeight: 22,
          }}
        >
          Your account has been restricted by an administrator and is currently
          unable to access the platform.
        </Text>

        {/* Logout Button */}
        <TouchableOpacity
          onPress={logout}
          style={{
            backgroundColor: colors.buttonBg,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 10,
            width: "100%",
            alignItems: "center",
          }}
        >
          <Text style={{ color: colors.buttonText, fontWeight: "600", fontSize: 16 }}>
            Log Out
          </Text>
        </TouchableOpacity>

      </View>
    </View>
  );
}
