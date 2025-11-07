// lib/friends.ts
import { auth, db } from "@/lib/firebaseConfig";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc,
    deleteDoc,
    serverTimestamp,
    orderBy,
    startAt,
    endAt,
    limit as qLimit,
} from "firebase/firestore";

/**
 * ---------------------------------------------------------------------------
 * Helper utilities
 * ---------------------------------------------------------------------------
 */

// Check if two users are already friends
async function areFriends(a: string, b: string): Promise<boolean> {
    const edge = await getDoc(doc(db, "members", a, "friends", b));
    return edge.exists();
}

// Check if a pending friend request exists between users
async function hasPendingRequest(fromUid: string, toUid: string): Promise<boolean> {
    const reqRef = doc(db, "members", toUid, "friendRequests", fromUid);
    const snap = await getDoc(reqRef);
    return snap.exists();
}

/**
 * ---------------------------------------------------------------------------
 * Friend search
 * ---------------------------------------------------------------------------
 */

/**
 * Search users by name prefix (case-insensitive).
 * Requires each user document to have `fullNameLower` stored.
 */
export async function searchMembersByName(namePrefix: string, limit = 10) {
    const term = namePrefix.trim().toLowerCase();
    if (!term) return [];

    // Requires Firestore index on fullNameLower
    const qy = query(
        collection(db, "members"),
        orderBy("fullNameLower"),
        startAt(term),
        endAt(term + "\uf8ff"),
        qLimit(limit)
    );

    const snap = await getDocs(qy);
    return snap.docs.map((d) => ({ uid: d.id, ...(d.data() as any) }));
}

/**
 * ---------------------------------------------------------------------------
 * Friend request flow
 * ---------------------------------------------------------------------------
 */

/**
 * Send a friend request to a target user by UID.
 * Idempotent: one outstanding request per sender→recipient.
 */
export async function sendFriendRequestToUid(targetUid: string) {
    const me = auth.currentUser!;
    if (!me) throw new Error("Not signed in");
    if (me.uid === targetUid) throw new Error("You cannot add yourself.");

    // already friends?
    if (await areFriends(me.uid, targetUid)) {
        throw new Error("You’re already friends.");
    }

    // pending either direction?
    if (await hasPendingRequest(me.uid, targetUid)) {
        throw new Error("You already sent a request.");
    }
    if (await hasPendingRequest(targetUid, me.uid)) {
        throw new Error("They already sent you a request — check your requests.");
    }

    // deterministic doc id = sender uid (so only one pending request per sender)
    const reqRef = doc(db, "members", targetUid, "friendRequests", me.uid); // recipient → friendRequests → senderUid
    await setDoc(
        reqRef,
        {
            fromUid: me.uid,
            fromName: me.displayName ?? me.email ?? "Unknown",
            createdAt: serverTimestamp(),
        },
        { merge: true }
    );

    const fromName =
        me.displayName ||
        (me as any)?.reloadUserInfo?.screenName ||
        me.email ||
        "Unknown";

    await setDoc(
        reqRef,
        {
            fromUid: me.uid,
            fromName,
            createdAt: serverTimestamp(),
        },
        { merge: true }
    );

    return reqRef.path;
}

/**
 * Accept a friend request.
 * Creates mutual friend edges and deletes the request.
 */
export async function acceptFriendRequest(requestId: string) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");

    const reqRef = doc(db, "members", me.uid, "friendRequests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) throw new Error("Request not found.");

    const { fromUid } = reqSnap.data() as { fromUid: string };

    // create mutual friend edges
    await Promise.all([
        setDoc(doc(db, "members", me.uid, "friends", fromUid), {
            createdAt: serverTimestamp(),
        }),
        setDoc(doc(db, "members", fromUid, "friends", me.uid), {
            createdAt: serverTimestamp(),
        }),
        deleteDoc(reqRef),
    ]);
}

/**
 * Remove a friend (both sides).
 */
export async function removeFriend(friendUid: string) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");

    await Promise.all([
        deleteDoc(doc(db, "members", me.uid, "friends", friendUid)),
        deleteDoc(doc(db, "members", friendUid, "friends", me.uid)),
    ]);
}
