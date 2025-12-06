// app/login.tsx
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { validateUser } from "@/lib/checkUserAccess";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  useColorScheme,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { login, signup } from "../lib/auth";
import { db, auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { getDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [zip, setZip] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState(false);

  const colorScheme = useColorScheme();
  const router = useRouter();

  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  // 🔥 MAIN AUTH EFFECT: checks profile existence, restriction, role
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) return;

      const ref = doc(db, "members", u.uid);
      let snap = await getDoc(ref);

      // ----------------------------------------------------------
      // 1️⃣ AUTO-RECREATE MEMBER DOCUMENT IF MISSING
      // ----------------------------------------------------------
      if (!snap.exists()) {
        console.log("⚠️ Member profile missing. Recreating...");

        const fullName = u.displayName || "Unknown User";
        const email = u.email || "";

        await setDoc(ref, {
          uid: u.uid,
          fullName,
          fullNameLower: fullName.toLowerCase(),
          email,
          phone: "",
          city: "",
          state: "",
          zip: "",
          role: "member",
          status: "ok",
          createdAt: serverTimestamp(),
          lastCheckIn: serverTimestamp(),
        });

        snap = await getDoc(ref);
        console.log("✅ Member profile recreated successfully");
      }

      // ----------------------------------------------------------
      // 2️⃣ VALIDATE USER ACCESS (role + status)
      // ----------------------------------------------------------
      const res = await validateUser(u);

      if (!res.allowed) {
        if (res.reason === "restricted") {
          router.replace("/restricted");
        } else {
          router.replace("/login");
        }
        return;
      }

      // ----------------------------------------------------------
      // 3️⃣ REDIRECT BY ROLE
      // ----------------------------------------------------------
      if (res.role === "admin") {
        router.replace("/admin/dashboard");
      } else {
        router.replace("/member/posts/homepage");
      }
    });

    return unsub;
  }, []);

  // 🔥 SUBMIT LOGIN/SIGNUP
  const onSubmit = async () => {
    if (
      !email ||
      !password ||
      (mode === "signup" &&
        (!fullName || !phone || !city || !stateName || !zip))
    ) {
      Alert.alert("Missing info", "Please fill all fields.");
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await signup(
          email.trim(),
          password,
          fullName.trim(),
          phone.trim(),
          city.trim(),
          stateName.trim(),
          zip.trim()
        );
      }

      // ❌Do NOT redirect manually: AuthState handles routing.
      // router.replace("/member/posts/homepage");

    } catch (e: any) {
      Alert.alert("Auth error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={[s.container, { backgroundColor: theme.bg }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[s.title, { color: theme.text }]}>
          DZ Community — {mode === "login" ? "Login" : "Create Account"}
        </Text>

        {mode === "signup" && (
          <>
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Full name"
              placeholderTextColor={theme.placeholder}
              value={fullName}
              onChangeText={setFullName}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="Phone number"
              placeholderTextColor={theme.placeholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="City"
              placeholderTextColor={theme.placeholder}
              value={city}
              onChangeText={setCity}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="State"
              placeholderTextColor={theme.placeholder}
              autoCapitalize="characters"
              value={stateName}
              onChangeText={setStateName}
            />
            <TextInput
              style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
              placeholder="ZIP"
              placeholderTextColor={theme.placeholder}
              keyboardType="numeric"
              value={zip}
              onChangeText={setZip}
            />
          </>
        )}

        <TextInput
          style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
          placeholder="Password"
          placeholderTextColor={theme.placeholder}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[s.btn, { backgroundColor: theme.buttonBg }]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={theme.buttonText} />
          ) : (
            <Text style={[s.btnTxt, { color: theme.buttonText }]}>
              {mode === "login" ? "Log in" : "Sign up"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setMode(mode === "login" ? "signup" : "login")}
        >
          <Text style={[s.link, { color: theme.link }]}>
            {mode === "login"
              ? "Don't have an account? Sign up"
              : "Have an account? Log in"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    width: "100%",
    borderWidth: 1,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 16,
  },
  btn: {
    width: "100%",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  btnTxt: {
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    marginTop: 14,
    fontSize: 15,
    textAlign: "center",
  },
});

const lightTheme = {
  bg: "#f9f9f9",
  text: "#111",
  border: "#ccc",
  inputBg: "#fff",
  placeholder: "#888",
  buttonBg: "#1e90ff",
  buttonText: "#fff",
  link: "#1e90ff",
};

const darkTheme = {
  bg: "#0d1117",
  text: "#e6edf3",
  border: "#30363d",
  inputBg: "#161b22",
  placeholder: "#8b949e",
  buttonBg: "#238636",
  buttonText: "#fff",
  link: "#2f81f7",
};
