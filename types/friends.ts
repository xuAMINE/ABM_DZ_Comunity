// types/friends.ts
import { Timestamp } from "firebase/firestore";

export type FriendRequestStatus = "pending" | "accepted" | "rejected";

export interface FriendRequest {
    id: string;
    fromUid: string;
    toUid: string;
    status: FriendRequestStatus;
    createdAt: Timestamp;
    respondedAt?: Timestamp;
}

export interface Friend {
    id: string;                // friendUid (doc id)
    friendUid: string;
    friendName: string;
    friendPhotoURL?: string | null;
    friendCity?: string;
    friendState?: string;
    createdAt?: Timestamp;
}
