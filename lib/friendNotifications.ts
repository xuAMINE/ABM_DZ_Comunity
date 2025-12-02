// lib/friendNotifications.ts
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";
import { NotificationType } from "@/types/notification";

type FriendNotificationType = Extract<
    NotificationType,
    "friend_request" | "friend_request_accepted"
>;

function requireCurrentUser() {
    const user = auth.currentUser;
    if (!user) throw new Error("Not authenticated");
    return user;
}

export async function sendFriendRequestNotification(recipientId: string) {
    const me = requireCurrentUser();

    await addDoc(collection(db, "users", recipientId, "notifications"), {
        recipientId,
        actorId: me.uid,
        actorName: me.displayName ?? "Someone",
        actorPhotoURL: me.photoURL ?? null,
        type: "friend_request" as FriendNotificationType,
        createdAt: serverTimestamp(),
        read: false,
    });
}

export async function sendFriendAcceptedNotification(recipientId: string) {
    const me = requireCurrentUser();

    await addDoc(collection(db, "users", recipientId, "notifications"), {
        recipientId,
        actorId: me.uid,
        actorName: me.displayName ?? "Someone",
        actorPhotoURL: me.photoURL ?? null,
        type: "friend_request_accepted" as FriendNotificationType,
        createdAt: serverTimestamp(),
        read: false,
    });
}
