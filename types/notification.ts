// types/notification.ts

export type NotificationType = "like" | "comment";

export type Notification = {
  id: string;

  // Who receives the notification
  recipientId: string;

  // Who triggered it
  actorId: string;
  actorName: string;
  actorPhotoURL?: string | null; // ⭐ NEW

  // What post it is about
  postId: string;
  postTitle?: string | null;

  // Type of event
  type: NotificationType;

  // Firestore timestamp
  createdAt?: any;

  // Has user opened/seen it?
  read: boolean;
};
