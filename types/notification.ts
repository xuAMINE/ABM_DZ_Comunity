// types/notification.ts

export type NotificationType =
    | "like"
    | "comment"
    | "friend_request"
    | "friend_request_accepted";

export type Notification = {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  actorPhotoURL?: string | null;
  postId?: string;
  postTitle?: string | null;
  type: NotificationType;
  createdAt: any;
  read: boolean;
};



