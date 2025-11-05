import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebaseConfig";

export const addFavorite = async (currentUserId: string, favoriteUserId: string) => {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, {
        favorites: arrayUnion(favoriteUserId),
    });
};

export const removeFavorite = async (currentUserId: string, favoriteUserId: string) => {
    const userRef = doc(db, "users", currentUserId);
    await updateDoc(userRef, {
        favorites: arrayRemove(favoriteUserId),
    });
};
