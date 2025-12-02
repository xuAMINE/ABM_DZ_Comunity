// lib/auth.ts
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  updateProfile, // ✅ added this
  User,
} from "firebase/auth";
import {
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";

// Listen to auth state
export const listenAuth = (cb: (u: User | null) => void) =>
  onAuthStateChanged(auth, cb);

// ✅ Sign up a new user (now also sets displayName in Firebase Auth)
export const signup = async (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  city: string,
  state: string,
  zip: string
) => {
  // 1️⃣ Create the user in Firebase Auth
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  // 2️⃣ Immediately update their display name in Auth
  await updateProfile(cred.user, { displayName: fullName });

  // 3️⃣ Compute groupId and create Firestore member document
  const groupId = `group_${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}_${zip}`;

  await setDoc(doc(db, "members", uid), {
    fullName,
    fullNameLower: fullName.toLowerCase(),
    email,
    phone,
    city,
    state,
    zip,
    groupId,
    role: "member",
    status: "ok",
    createdAt: serverTimestamp(),
    lastCheckIn: serverTimestamp(),
  });

  // ✅ Return the user (with updated displayName)
  return cred.user;
};

// Log in existing user
export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

// Log out user
export const logout = () => signOut(auth);

// Fetch member profile
export const getMyProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "members", uid));
  return snap.exists() ? snap.data() : null;
};
