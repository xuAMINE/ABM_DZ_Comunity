
// lib/checkUserAccess.ts
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { User } from "firebase/auth";

export async function validateUser(u: User | null) {
  if (!u) return { allowed: false };

  const ref = doc(db, "members", u.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return { allowed: false, reason: "no_profile" };
  }

  const data = snap.data();

  // 🚫 Restricted?
  if (data.status === "restricted") {
    return { allowed: false, reason: "restricted" };
  }

  // 👑 Role
  return {
    allowed: true,
    role: data.role,
    profile: data,
  };
}
