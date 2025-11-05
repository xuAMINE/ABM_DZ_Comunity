import * as Notifications from "expo-notifications";
import { db } from "./firebaseConfig";
import { updateDoc, doc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";

/**
 * Schedule a repeating local notification every 3 days
 */
export const scheduleCheckIn = async (userId: string) => {
    await Notifications.cancelAllScheduledNotificationsAsync(); // avoid duplicates
    await Notifications.scheduleNotificationAsync({
        content: {
            title: "Check-in",
            body: "Hey! Are you okay?",
            data: { userId },
        },
        trigger: { seconds: 3 * 24 * 60 * 60, repeats: true },
    });
};

/**
 * Update user's check-in status in Firestore
 */
export const updateUserStatus = async (userId: string, status: "okay" | "not okay") => {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
        status,
        lastCheckIn: serverTimestamp(),
    });
};

/**
 * Notify all users who have this user in their favorites
 */
export const notifyFavorites = async (userId: string, status: "okay" | "not okay") => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("favorites", "array-contains", userId));
    const snapshot = await getDocs(q);

    snapshot.forEach(async (docSnap) => {
        const favoriteUser = docSnap.data();
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Favorite Update ❤️",
                body: `${favoriteUser.name || "A friend"} said they are "${status}"`,
            },
            trigger: null,
        });
    });
};
