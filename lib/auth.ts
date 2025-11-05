// /lib/auth.ts
import { auth, db } from "./firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
  User,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc } from "firebase/firestore";

export const listenAuth = (cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);

export const signup = async (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  city: string,
  state: string,
  zip: string
) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  const groupId = `group_${city.toLowerCase().replace(/\s+/g, "_")}_${state.toLowerCase()}_${zip}`;

  await setDoc(doc(db, "members", uid), {
    fullName,
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

  return cred.user;
};

export const login = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const logout = () => signOut(auth);

export const getMyProfile = async (uid: string) => {
  const snap = await getDoc(doc(db, "members", uid));
  return snap.exists() ? snap.data() : null;
};
