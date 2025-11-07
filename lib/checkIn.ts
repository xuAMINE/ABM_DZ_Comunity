// lib/checkins.ts
import { auth, db } from "./firebaseConfig";
import {
    addDoc, collection, serverTimestamp, getDocs, doc, setDoc
} from "firebase/firestore";

/** User submits their check-in answer */
export async function submitCheckin(status: "ok" | "not_ok", note?: string) {
    const me = auth.currentUser;
    if (!me) throw new Error("Not signed in");

    // 1) record the checkin
    const ref = await addDoc(collection(db, "checkins"), {
        uid: me.uid,
        status,
        note: note || null,
        createdAt: serverTimestamp(),
    });

    // 2) fan-out "inbox" notifications to all of my friends
    const friendsSnap = await getDocs(collection(db, "members", me.uid, "friends"));
    const friends = friendsSnap.docs.map((d) => d.id);

    const writes: Promise<any>[] = [];
    for (const fuid of friends) {
        const inboxDoc = doc(collection(db, "members", fuid, "inbox"));
        writes.push(
            setDoc(inboxDoc, {
                type: "friend_checkin",
                fromUid: me.uid,
                status,
                note: note || null,
                createdAt: serverTimestamp(),
                read: false,
            })
        );
    }
    await Promise.all(writes);

    return ref.id;
}
