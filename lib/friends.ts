// lib/friends.ts
import { auth, db } from "./firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    where,
    writeBatch,
    Unsubscribe,
} from "firebase/firestore";
import { Friend, FriendRequest } from "@/types/friends";
import {
    sendFriendRequestNotification,
    sendFriendAcceptedNotification,
} from "./friendNotifications";

/** For actions that MUST have a logged-in user */
function requireAuth() {
    const user = auth.currentUser;
    if (!user) throw new Error("User not authenticated");
    return user;
}

/** For listeners – can be null, don’t throw */
function getCurrentUser() {
    return auth.currentUser;
}

function friendsCollection(uid: string) {
    return collection(db, "users", uid, "friends");
}

/* ------------------- SEND / RESPOND ------------------- */

export async function sendFriendRequest(toUid: string) {
    const me = requireAuth();

    if (me.uid === toUid) {
        throw new Error("You cannot send a friend request to yourself.");
    }

    // already friends?
    const existingFriend = await getDoc(
        doc(db, "users", me.uid, "friends", toUid)
    );
    if (existingFriend.exists()) {
        throw new Error("You are already friends with this user.");
    }

    // existing pending outgoing request me -> them
    const existingOutgoing = await getDocs(
        query(
            collection(db, "friendRequests"),
            where("fromUid", "==", me.uid),
            where("toUid", "==", toUid),
            where("status", "==", "pending")
        )
    );
    if (!existingOutgoing.empty) {
        throw new Error("Friend request already sent.");
    }

    // optional: check if they already sent me one
    const existingIncoming = await getDocs(
        query(
            collection(db, "friendRequests"),
            where("fromUid", "==", toUid),
            where("toUid", "==", me.uid),
            where("status", "==", "pending")
        )
    );
    if (!existingIncoming.empty) {
        throw new Error("This user already has a pending request with you.");
    }

    // create friend request
    await addDoc(collection(db, "friendRequests"), {
        fromUid: me.uid,
        toUid,
        status: "pending",
        createdAt: serverTimestamp(),
    });

    // notify recipient
    await sendFriendRequestNotification(toUid);
}

export async function respondToFriendRequest(
    requestId: string,
    accept: boolean
) {
    const me = requireAuth();

    const requestRef = doc(db, "friendRequests", requestId);
    const snap = await getDoc(requestRef);
    if (!snap.exists()) throw new Error("Friend request not found.");

    const data = snap.data() as Omit<FriendRequest, "id">;

    if (data.toUid !== me.uid) {
        throw new Error("You are not allowed to respond to this request.");
    }
    if (data.status !== "pending") {
        throw new Error("This request has already been handled.");
    }

    const batch = writeBatch(db);

    // update request status
    batch.update(requestRef, {
        status: accept ? "accepted" : "rejected",
        respondedAt: serverTimestamp(),
    });

    if (accept) {
        const { fromUid, toUid } = data;

        // pull minimal profile data
        const fromProfileSnap = await getDoc(doc(db, "members", fromUid));
        const toProfileSnap = await getDoc(doc(db, "members", toUid));

        const fromProfile = fromProfileSnap.data() ?? {};
        const toProfile = toProfileSnap.data() ?? {};

        // users/{fromUid}/friends/{toUid}
        batch.set(doc(db, "users", fromUid, "friends", toUid), {
            friendUid: toUid,
            friendName: toProfile.fullName ?? "",
            friendPhotoURL: toProfile.photoURL ?? null,
            friendCity: toProfile.city ?? "",
            friendState: toProfile.state ?? "",
            createdAt: serverTimestamp(),
        });

        // users/{toUid}/friends/{fromUid}
        batch.set(doc(db, "users", toUid, "friends", fromUid), {
            friendUid: fromUid,
            friendName: fromProfile.fullName ?? "",
            friendPhotoURL: fromProfile.photoURL ?? null,
            friendCity: fromProfile.city ?? "",
            friendState: fromProfile.state ?? "",
            createdAt: serverTimestamp(),
        });
    }

    await batch.commit();

    if (accept) {
        // notify original sender that it was accepted
        await sendFriendAcceptedNotification(data.fromUid);
    }
}

/* ------------------- LISTENERS ------------------- */

export function listenFriends(callback: (friends: Friend[]) => void): Unsubscribe {
    const me = getCurrentUser();
    if (!me) return () => {};

    const q = query(friendsCollection(me.uid), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
        const items: Friend[] = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<Friend, "id">;
            items.push({ id: docSnap.id, ...data });
        });
        callback(items);
    },
        (err) => {
            console.error("listenIncomingFriendRequests error:", err);
        }
    );
}

export function listenIncomingFriendRequests(
    callback: (requests: FriendRequest[]) => void
): Unsubscribe {
    const me = getCurrentUser();
    if (!me) return () => {};

    const q = query(
        collection(db, "friendRequests"),
        where("toUid", "==", me.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
        const items: FriendRequest[] = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<FriendRequest, "id">;
            items.push({ id: docSnap.id, ...data });
        });
        callback(items);
    },
        (err) => {
            console.error("listenIncomingFriendRequests error:", err);
        }
    );

}

export function listenOutgoingFriendRequests(
    callback: (requests: FriendRequest[]) => void
): Unsubscribe {
    const me = getCurrentUser();
    if (!me) return () => {};

    const q = query(
        collection(db, "friendRequests"),
        where("fromUid", "==", me.uid),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snap) => {
        const items: FriendRequest[] = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data() as Omit<FriendRequest, "id">;
            items.push({ id: docSnap.id, ...data });
        });
        callback(items);
    },
        (err) => {
            console.error("listenIncomingFriendRequests error:", err);
        }

    );
}

/* ------------------- REMOVE FRIEND ------------------- */

export async function removeFriend(friendUid: string) {
    const me = requireAuth();
    const batch = writeBatch(db);

    batch.delete(doc(db, "users", me.uid, "friends", friendUid));
    batch.delete(doc(db, "users", friendUid, "friends", me.uid));

    await batch.commit();
}
