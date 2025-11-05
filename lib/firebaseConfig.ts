import { Platform } from "react-native";
import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, initializeAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyCeFl_K7F3rLL-g8pqo0Aqr8gP7ZcljOMo",
  authDomain: "dzcommunity-d1f7e.firebaseapp.com",
  projectId: "dzcommunity-d1f7e",
  storageBucket: "dzcommunity-d1f7e.firebasestorage.app",
  messagingSenderId: "1079855544105",
  appId: "1:1079855544105:web:10df32d23ce18637922938",
};

const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

let auth: Auth;

if (Platform.OS !== "web") {
  // ✅ Native (Expo Go)
  const { getReactNativePersistence } = require("firebase/auth");
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  // ✅ Web
  auth = getAuth(app);
}

const db: Firestore = getFirestore(app);

export { app, auth, db };
