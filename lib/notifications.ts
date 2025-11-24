// lib/notifications.ts
import { auth, db } from "./firebase";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  updateDoc,
  writeBatch,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import type { NotificationType } from "@/types/notification";

// 👇 FIX: Notifications now live inside /users/<uid>/notifications
function userNotificationsCol(uid: string) {
  return collection(db, "users", uid, "notifications");
}

// 🔔 Create a new notification
export async function createNotification(params: {
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhotoURL?: string | null;
  postId: string;
  postTitle?: string | null;
  type: NotificationType;
}) {
  const {
    recipientId,
    actorId,
    actorName,
    actorPhotoURL,
    postId,
    postTitle,
    type,
  } = params;

  // Don't notify yourself
  if (!recipientId || recipientId === actorId) return;

  const col = userNotificationsCol(recipientId);

  await addDoc(col, {
    recipientId,
    actorId,
    actorName,
    actorPhotoURL: actorPhotoURL ?? null,
    postId,
    postTitle: postTitle ?? "A post",
    type,
    createdAt: serverTimestamp(),
    read: false,
  });
}

// 🔔 One-time fetch (not real-time)
export async function getMyNotifications(limitCount = 50) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const col = userNotificationsCol(uid);

  const q = query(
    col,
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
}

// 🔔 Mark ONE notification as read
export async function markNotificationRead(id: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  await updateDoc(doc(db, "users", uid, "notifications", id), {
    read: true,
  });
}

// 🔔 Mark ALL notifications as read
export async function markAllNotificationsRead() {
  const uid = auth.currentUser?.uid;
  if (!uid) return;

  const col = userNotificationsCol(uid);

  const q = query(col, where("read", "==", false));
  const snap = await getDocs(q);

  if (snap.empty) return;

  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

// 🔔 Live unread indicator (TopBar)
// 🔔 Live unread count
export function listenUnreadNotifications(
  uid: string,
  cb: (count: number) => void
) {
  const col = userNotificationsCol(uid);

  const q = query(col, where("read", "==", false));

  console.log("📡 Listening to unread notifications count…");

  return onSnapshot(
    q,
    (snap) => {
      console.log("🔥 Unread count:", snap.size);
      cb(snap.size);
    },
    (err) => console.error("❌ Snapshot Error", err)
  );
}


// 🗑️ Bulk delete (swipe-to-delete)
export async function deleteNotifications(ids: string[]) {
  const uid = auth.currentUser?.uid;
  if (!uid || !ids.length) return;

  const batch = writeBatch(db);
  ids.forEach((id) =>
    batch.delete(doc(db, "users", uid, "notifications", id))
  );
  await batch.commit();
}
