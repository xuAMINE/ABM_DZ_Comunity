// lib/adminMembers.ts
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  orderBy,
  limit,
} from "firebase/firestore";

// 🔍 Search members
export async function searchMembers(term: string) {
  if (!term) return [];

  const membersRef = collection(db, "members");
  const termLower = term.toLowerCase();

  // We search by: email, fullName, phone
  const q = query(membersRef, limit(20));

  const snap = await getDocs(q);
  const result: any[] = [];

  snap.forEach((docSnap) => {
    const data = docSnap.data();
    const haystack =
      `${data.fullName} ${data.email} ${data.phone}`.toLowerCase();

    if (haystack.includes(termLower)) {
      result.push({ id: docSnap.id, ...data });
    }
  });

  return result;
}

// 🚫 Restrict a member
export async function restrictMember(uid: string) {
  return updateDoc(doc(db, "members", uid), {
    status: "restricted",
  });
}

// 🔓 Unrestrict member
export async function unrestrictMember(uid: string) {
  return updateDoc(doc(db, "members", uid), {
    status: "ok",
  });
}

// 👑 Assign role (admin / moderator / member)
export async function assignRole(uid: string, role: string) {
  return updateDoc(doc(db, "members", uid), {
    role,
  });
}
