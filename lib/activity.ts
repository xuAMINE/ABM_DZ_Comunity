// lib/activity.ts
import { db, auth } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function logActivity(data: any) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  await addDoc(collection(db, "users", uid, "activity"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
