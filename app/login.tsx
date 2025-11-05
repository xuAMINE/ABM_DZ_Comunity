import { useState, useEffect } from "react";
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
} from "react-native";
import { login, signup } from "../lib/auth";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

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
  const isDark = colorScheme === "dark";
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    async function testFirestore() {
      try {
        const snapshot = await getDocs(collection(db, "members"));
        console.log("✅ Firestore connected! Total docs:", snapshot.size);
      } catch (error) {
        console.error("❌ Firestore error:", error);
      }
    }
    testFirestore();
  }, []);

  const onSubmit = async () => {
    if (
      !email ||
      !password ||
      (mode === "signup" && (!fullName || !phone || !city || !stateName || !zip))
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
    } catch (e: any) {
      Alert.alert("Auth error", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={[s.container, { backgroundColor: theme.bg }]}
      keyboardShouldPersistTaps="handled"
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
            placeholder="City (e.g., Chicago)"
            placeholderTextColor={theme.placeholder}
            value={city}
            onChangeText={setCity}
          />
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="State (e.g., IL)"
            placeholderTextColor={theme.placeholder}
            autoCapitalize="characters"
            value={stateName}
            onChangeText={setStateName}
          />
          <TextInput
            style={[s.input, { backgroundColor: theme.inputBg, color: theme.text, borderColor: theme.border }]}
            placeholder="ZIP code"
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

      <TouchableOpacity onPress={() => setMode(mode === "login" ? "signup" : "login")}>
        <Text style={[s.link, { color: theme.link }]}>
          {mode === "login"
            ? "Don't have an account? Sign up"
            : "Have an account? Log in"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
  },
  btnTxt: {
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    marginTop: 14,
    fontSize: 15,
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
