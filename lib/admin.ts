// lib/admin.ts
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

// 🔥 Count total documents in a collection
export async function countCollection(path: string) {
  const snap = await getDocs(collection(db, path));
  return snap.size;
}

// 🔥 Count posts by status
export async function countPostsByStatus(status: string) {
  const q = query(collection(db, "posts"), where("status", "==", status));
  const snap = await getDocs(q);
  return snap.size;
}

// 🔥 Count members who checked in within last 24 hours
export async function countActiveMembers() {
  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const q = query(collection(db, "members"), where("lastCheckIn", ">=", since));
  const snap = await getDocs(q);
  return snap.size;
}

// 🔥 Count new members last 7 days
export async function countNewMembers() {
  const since = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const q = query(collection(db, "members"), where("createdAt", ">=", since));
  const snap = await getDocs(q);
  return snap.size;
}

// 🔥 Count posts created today
export async function countPostsToday() {
  const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
  const q = query(collection(db, "posts"), where("createdAt", ">=", since));
  const snap = await getDocs(q);
  return snap.size;
}
