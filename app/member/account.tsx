// app/member/account.tsx

import { useEffect, useState } from "react";
import { TopBar } from "@/components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";


import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";

import {
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";

import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { useAppTheme } from "@/lib/theme";
import { Feather } from "@expo/vector-icons";

// ------------------------------------------------------------
// Reusable Editable Field Component
// ------------------------------------------------------------
function FieldRow({
  label,
  value,
  editable,
  onChange,
  onToggleEdit,
  theme,
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  onToggleEdit: () => void;
  theme: any;
}) {
  return (
    <View style={{ marginBottom: 18 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <Text style={{ fontWeight: "600", color: theme.text }}>{label}</Text>

        {/* Edit icon */}
        <TouchableOpacity onPress={onToggleEdit}>
          <Feather name="edit" size={16} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <TextInput
        value={value}
        onChangeText={onChange}
        editable={editable}
        style={{
          backgroundColor: editable ? theme.inputBg : theme.card,
          color: theme.text,
          padding: 12,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.border,
          opacity: editable ? 1 : 0.8,
        }}
      />
    </View>
  );
}

// ------------------------------------------------------------
// MAIN ACCOUNT SCREEN
// ------------------------------------------------------------

export default function AccountScreen() {
  const { theme } = useAppTheme();
  const user = auth.currentUser;

  const [profile, setProfile] = useState<any>({});
  const [editing, setEditing] = useState<{ [key: string]: boolean }>({});

  const [saving, setSaving] = useState(false);

  // ------------------------------------------------------------
  // LOAD PROFILE
  // ------------------------------------------------------------

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const snap = await getDoc(doc(db, "members", user.uid));
      if (snap.exists()) {
        setProfile(snap.data());
      } else {
        setProfile({
          fullName: user.displayName || "",
          email: user.email,
        });
      }
    };
    load();
  }, [user]);

  // ------------------------------------------------------------
  // SAVE PROFILE
  // ------------------------------------------------------------
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Update Auth displayName
      await updateProfile(user, {
        displayName: profile.fullName,
      });

      // Update Firestore
      await setDoc(doc(db, "members", user.uid), profile, { merge: true });

      Alert.alert("Success", "Your account has been updated.");
      setEditing({});
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // SEND PASSWORD RESET
  // ------------------------------------------------------------
  const handlePasswordReset = async () => {
    if (!user?.email) return;

    try {
      await sendPasswordResetEmail(auth, user.email);
      Alert.alert(
        "Email sent",
        "Check your inbox for password reset instructions."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not send reset email.");
    }
  };

  // ------------------------------------------------------------
  // DEACTIVATE ACCOUNT
  // ------------------------------------------------------------
const handleDeactivate = async () => {
  if (!user) return;

  Alert.alert(
    "Deactivate account?",
    "Your account will be deleted in 7 days. If you log in before then, you can cancel the deletion.",
    [
      { text: "Cancel", style: "cancel" },
      {
        text: "Deactivate",
        style: "destructive",
        onPress: async () => {
          try {
            const fn = httpsCallable(getFunctions(), "scheduleAccountDeletion");
            await fn();

            await signOut(auth);

            Alert.alert(
              "Scheduled",
              "Your account is scheduled for deletion in 7 days."
            );
          } catch (err: any) {
            Alert.alert("Error", err.message || "Could not deactivate.");
          }
        },
      },
    ]
  );
};




  // ------------------------------------------------------------
  // UI
  // ------------------------------------------------------------

return (
  <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={["top"]}>
    
    {/* ⭐ Global Top Navigation Bar */}
    <TopBar />

    {/* ⭐ Main Content (ScrollView stays exactly like before) */}
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "700",
          color: theme.text,
          marginBottom: 20,
        }}
      >
        Account
      </Text>

      {/* FULL NAME */}
      <FieldRow
        label="Full Name"
        value={profile.fullName || ""}
        editable={!!editing.fullName}
        onChange={(v) => setProfile({ ...profile, fullName: v })}
        onToggleEdit={() =>
          setEditing({ ...editing, fullName: !editing.fullName })
        }
        theme={theme}
      />

      {/* PHONE */}
      <FieldRow
        label="Phone"
        value={profile.phone || ""}
        editable={!!editing.phone}
        onChange={(v) => setProfile({ ...profile, phone: v })}
        onToggleEdit={() => setEditing({ ...editing, phone: !editing.phone })}
        theme={theme}
      />

      {/* CITY */}
      <FieldRow
        label="City"
        value={profile.city || ""}
        editable={!!editing.city}
        onChange={(v) => setProfile({ ...profile, city: v })}
        onToggleEdit={() => setEditing({ ...editing, city: !editing.city })}
        theme={theme}
      />

      {/* STATE */}
      <FieldRow
        label="State"
        value={profile.state || ""}
        editable={!!editing.state}
        onChange={(v) => setProfile({ ...profile, state: v })}
        onToggleEdit={() => setEditing({ ...editing, state: !editing.state })}
        theme={theme}
      />

      {/* ZIP */}
      <FieldRow
        label="ZIP Code"
        value={profile.zip || ""}
        editable={!!editing.zip}
        onChange={(v) => setProfile({ ...profile, zip: v })}
        onToggleEdit={() => setEditing({ ...editing, zip: !editing.zip })}
        theme={theme}
      />

      {/* EMAIL */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontWeight: "600",
            color: theme.text,
            marginBottom: 6,
          }}
        >
          Email
        </Text>

        <Text style={{ color: theme.placeholder }}>{user?.email}</Text>
      </View>

      {/* SAVE BUTTON */}
      <TouchableOpacity
        onPress={handleSave}
        style={{
          backgroundColor: theme.primary,
          borderRadius: 10,
          padding: 14,
          alignItems: "center",
          marginTop: 10,
        }}
        disabled={saving}
      >
        <Text style={{ color: "#fff", fontWeight: "700" }}>
          {saving ? "Saving..." : "Save Changes"}
        </Text>
      </TouchableOpacity>

      {/* PASSWORD RESET */}
      <View style={{ marginTop: 40 }}>
        <Text
          style={{
            fontWeight: "600",
            color: theme.text,
            marginBottom: 8,
            fontSize: 16,
          }}
        >
          Password
        </Text>

        <TouchableOpacity
          onPress={handlePasswordReset}
          style={{
            padding: 12,
            backgroundColor: theme.card,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: theme.primary, fontWeight: "600" }}>
            Send password reset email
          </Text>
        </TouchableOpacity>
      </View>

      {/* DANGER ZONE */}
      <View style={{ marginTop: 40 }}>
        <Text
          style={{
            fontWeight: "600",
            color: theme.text,
            marginBottom: 8,
            fontSize: 16,
          }}
        >
          Danger zone
        </Text>

        <TouchableOpacity
          onPress={handleDeactivate}
          style={{
            padding: 12,
            backgroundColor: "#ffdddd22",
            borderWidth: 1,
            borderColor: "red",
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "red", fontWeight: "700" }}>
            Deactivate Account
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  </SafeAreaView>
);

}
