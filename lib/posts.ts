// lib/posts.ts
import { auth, db } from './firebase';
import { logActivity } from "./activity";
import { createNotification } from "@/lib/notifications";
import { upsertPostReportToAdminInbox } from "@/lib/adminNotifications";

import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  deleteDoc,
  DocumentData,
  QueryDocumentSnapshot,
  orderBy,
  startAfter,
  limit as firestoreLimit,
  QueryConstraint,
  setDoc,
} from "firebase/firestore";

import { getMemberProfile } from './member'; // ⬅️ add this
import { Post } from '../types/post';
import { Notification } from '../types/notification';


type MemberProfile = {
  uid: string;
  fullName?: string;
  city?: string;
  state?: string;
  // keep it flexible for any extra fields
  [k: string]: any;
};

// Local view of Post that includes denormalized author fields
type AugmentedPost = Post & {
  authorId?: string | null;
  authorName?: string | null;
  authorCity?: string | null;
  authorState?: string | null;
};

// Reference to posts collection
const postsCol = collection(db, 'posts');

/** ------------------ CREATE ------------------ **/
// ---- createPost (robust + logs) ----
export async function createPost(
  input: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'ownerId'>
): Promise<AugmentedPost> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  // ✅ Get member profile from Firestore
  const profileSnap = await getDoc(doc(db, 'members', uid));
  if (!profileSnap.exists()) {
    throw new Error('Member profile not found — please re-login.');
  }

  const profile = profileSnap.data() as any;

  const authorName = profile.fullName || profile.name || 'Unknown Member';
  const authorCity = profile.city || null;
  const authorState = profile.state || null;

  const autoApproved = input.category?.toLowerCase() !== "pub";

  const payload = {
    ...input,
    ownerId: uid,

    status: autoApproved ? "approved" : "pending",
    publishedAt: autoApproved ? serverTimestamp() : null,

    authorId: uid,
    authorName,
    authorCity,
    authorState,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'posts'), payload);
      // AFTER creating post:
    await logActivity({
      type: "create",
      postId: docRef.id,
      postTitle: input.title,
      category: input.category,
    });
  return { id: docRef.id, ...payload } as AugmentedPost;
}


/** ------------------ READ (MY POSTS) ------------------ **/
export async function getMyPosts() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const q = query(postsCol, where('ownerId', '==', uid), limit(50));
  const snap = await getDocs(q);

  const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...(d.data() as Record<string, any>),
  })) as Post[]; // <-- cast once here

  // sort client-side by createdAt desc
  return items.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}



/** ------------------ READ (SINGLE POST) ------------------ **/
export async function getPostById(id: string) {
  const snap = await getDoc(doc(db, 'posts', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as Record<string, any>) } as Post;
}

/** ------------------ UPDATE ------------------ **/
export async function updatePost(id: string, updates: Partial<Post>) {
  const ref = doc(db, 'posts', id);
  await updateDoc(ref, {
    ...(updates as Record<string, any>),
    updatedAt: serverTimestamp(),
  });
  await logActivity({
  type: "update",
  postId: id,
  postTitle: updates.title,
  category: updates.category,
});

}

/** ------------------ DELETE ------------------ **/
export async function deletePost(id: string) {
  await deleteDoc(doc(db, 'posts', id));
}

/** ------------------ ADMIN HELPERS ------------------ **/
export async function adminListPosts(status?: Post['status']) {
  const q = status
    ? query(postsCol, where('status', '==', status), limit(100))
    : query(postsCol, limit(100));

  const snap = await getDocs(q);

  const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...(d.data() as Record<string, any>),
  })) as Post[];

  return items.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}



/** ------------------ ADMIN MODERATION ------------------ **/
export async function setModeration(
  id: string,
  status: 'approved' | 'rejected'
) {
  const ref = doc(db, 'posts', id);
  await updateDoc(ref, {
    status,
    updatedAt: serverTimestamp(),
    ...(status === 'approved' ? { publishedAt: serverTimestamp() } : {}),
  });
}


/** ------------------ READ (PUBLIC FEED FOR TESTING) ------------------ **/
// For testing: get newest posts of *any* status (approved, pending, rejected)
export async function getPublicFeed(count = 50): Promise<AugmentedPost[]> {
  try {
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as AugmentedPost[];

    const needsHydration = posts.filter(
      p => !p.authorName || p.authorName === 'Member' || p.authorName === ''
    );

    if (needsHydration.length > 0) {
      const getUid = (p: AugmentedPost) => p.ownerId ?? p.authorId ?? null;
      const uids = Array.from(
        new Set(
          needsHydration
            .map(getUid)
            .filter((x): x is string => typeof x === 'string' && x.length > 0)
        )
      );

      const cache = new Map<string, MemberProfile | null>();
      await Promise.all(
        uids.map(async (uid) => {
          const prof = (await getMemberProfile(uid)) as MemberProfile | null;
          cache.set(uid, prof);
        })
      );

      for (const p of posts) {
        if (!p.authorName || p.authorName === 'Member' || p.authorName === '') {
          const uid = getUid(p);
          const prof = (uid && cache.get(uid)) || null;

          const name =
            prof?.fullName ??
            (prof as any)?.name ??
            'Member';

          p.authorId   = p.authorId   ?? uid ?? null;
          p.authorName = name;
          p.authorCity = prof?.city ?? null;
          p.authorState= prof?.state ?? null;

          // Optional backfill (will only succeed if current user can update this doc)
          if (uid && typeof p.id === 'string' && name !== 'Member') {
            try {
              await updateDoc(doc(db, 'posts', p.id), {
                authorId: uid,
                authorName: name,
                authorCity: p.authorCity ?? null,
                authorState: p.authorState ?? null,
                updatedAt: serverTimestamp(),
              });
            } catch (e) {
              // Not owner? Rules block? Fine—UI is already hydrated.
              console.warn('[getPublicFeed] Backfill skipped for', p.id, e);
            }
          }
        }
      }
    }

    return posts;
  } catch (err) {
    console.error('❌ getPublicFeed failed:', err);
    throw err;
  }
}






/** getMyPosts, getPostById, updatePost, deletePost unchanged ... */

/** ------------------ OPTIONAL: filtered list later (prod) ------------------ **/
// Use this when you’re ready to show only approved posts in production
export async function getApprovedFeed(count = 50) {
  const q = query(
    postsCol,
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  const items = snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
    id: d.id,
    ...(d.data() as Record<string, any>),
  })) as Post[];
  return items.sort((a, b) => {
    const ta = (a.createdAt as any)?.toMillis?.() ?? 0;
    const tb = (b.createdAt as any)?.toMillis?.() ?? 0;
    return tb - ta;
  });
}



/** ------------------ LIKES ------------------ **/






export async function toggleLike(postId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const likeRef = doc(db, "posts", postId, "likes", uid);
  const snap = await getDoc(likeRef);

  // Get post once
  const post = await getPostById(postId);
  const postOwnerId = post?.ownerId;
  const postTitle = post?.title || "A post";
  const postAuthorName = (post as any)?.authorName || "";

  if (snap.exists()) {
    // UNLIKE
    await deleteDoc(likeRef);
    return false;
  } else {
    // LIKE
    await setDoc(likeRef, {
      userId: uid,
      createdAt: serverTimestamp(),
    });

    // Get actor profile for name + avatar
    const profile = await getMemberProfile(uid);
    const actorName =
      (profile as any)?.fullName ||
      (profile as any)?.name ||
      auth.currentUser?.displayName ||
      "Member";

    const actorPhotoURL =
      (profile as any)?.photoURL || auth.currentUser?.photoURL || null;

    // 🔔 Notification to post owner
    if (postOwnerId && postOwnerId !== uid) {
      await createNotification({
        recipientId: postOwnerId,
        actorId: uid,
        actorName,
        actorPhotoURL,
        postId,
        postTitle,
        type: "like",
      });
    }

    // Activity log
    await logActivity({
      type: "like",
      postId,
      postTitle,
      targetUserName: postAuthorName,
    });

    return true;
  }
}




export async function getLikeCount(postId: string) {
  const snap = await getDocs(collection(db, "posts", postId, "likes"));
  return snap.size;
}

export async function isPostLikedByMe(postId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return false;

  const ref = doc(db, "posts", postId, "likes", uid);
  const snap = await getDoc(ref);
  return snap.exists();
}


/** ------------------ COMMENTS ------------------ **/



export async function addComment(postId: string, text: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  const profileSnap = await getDoc(doc(db, "members", uid));
  const profile = profileSnap.exists() ? profileSnap.data() : null;

  const authorName = profile?.fullName || "Member";
  const actorPhotoURL =
    (profile as any)?.photoURL || auth.currentUser?.photoURL || null;

  const payload = {
    userId: uid,
    text,
    authorName,
    createdAt: serverTimestamp(),
  };

  // Save comment
  await addDoc(collection(db, "posts", postId, "comments"), payload);

  // Get post info once
  const post = await getPostById(postId);
  const postOwnerId = post?.ownerId;
  const postTitle = post?.title || "A post";
  const postAuthorName = (post as any)?.authorName;

  // 🔔 Notification to post owner
  if (postOwnerId && postOwnerId !== uid) {
    await createNotification({
      recipientId: postOwnerId,
      actorId: uid,
      actorName: authorName,
      actorPhotoURL,
      postId,
      postTitle,
      type: "comment",
    });
  }

  // Activity log
  await logActivity({
    type: "comment",
    postId,
    postTitle,
    targetUserName: postAuthorName,
    commentText: text,
  });
}





export async function getComments(postId: string) {
  const q = query(
    collection(db, "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
}


/** ------------------ INLINE COMMENTS (PAGINATED) ------------------ **/


export async function getCommentsPaginated(
  postId: string,
  limitCount = 10,
  cursor?: QueryDocumentSnapshot
) {
  const constraints: QueryConstraint[] = [
    orderBy("createdAt", "asc"),
  ];

  if (cursor) {
    constraints.push(startAfter(cursor));
  }

  constraints.push(firestoreLimit(limitCount));

  const q = query(
    collection(db, "posts", postId, "comments"),
    ...constraints
  );

  const snap = await getDocs(q);

  return {
    comments: snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    })),
    cursor: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : undefined,
  };
}

/** ------------------ POLLS ------------------ **/

// Get aggregated counts for a poll
export async function getPollVotes(postId: string) {
  const snap = await getDocs(collection(db, "posts", postId, "pollVotes"));

  const counts: Record<string, number> = {};
  snap.forEach((d) => {
    const data = d.data() as any;
    const optionId = data.optionId;
    if (!optionId) return;
    counts[optionId] = (counts[optionId] ?? 0) + 1;
  });

  return {
    counts,
    total: snap.size,
  };
}

// Get the current user's selected option (if any)
export async function getMyPollVote(postId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return null;

  const ref = doc(db, "posts", postId, "pollVotes", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  return data.optionId ?? null;
}

// Cast / change a vote
export async function voteOnPoll(postId: string, optionId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not authenticated");

  await setDoc(
      doc(db, "posts", postId, "pollVotes", uid),
      {
        userId: uid,
        optionId,
        createdAt: serverTimestamp(),
      },
      { merge: true }
  );

  // You can add notifications / logActivity here later if you want
}


/** ------------------ REPORT POST ------------------ **/


export async function reportPost(postId: string, reason: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  // reporter info (basic)
  let reporterName =
    auth.currentUser?.displayName || auth.currentUser?.email || "Member";
  let reporterPhotoURL = auth.currentUser?.photoURL ?? null;

  // (optional but recommended) hydrate reporter info from members collection
  try {
    const profSnap = await getDoc(doc(db, "members", uid));
    if (profSnap.exists()) {
      const p = profSnap.data() as any;
      reporterName = p.fullName || p.name || reporterName;
      reporterPhotoURL = p.photoURL || reporterPhotoURL;
    }
  } catch (e) {
    console.log("Could not load reporter profile; using auth fields", e);
  }

  // 1) Save report under the post (source of truth)
  await setDoc(
    doc(db, "posts", postId, "reports", uid),
    {
      userId: uid,
      reporterName,
      reporterPhotoURL,
      reason,
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );

  // 2) Flag post (optional)
  try {
    await updateDoc(doc(db, "posts", postId), {
      reported: true,
      lastReportedAt: serverTimestamp(),
    });
  } catch (e) {
    console.log("Not allowed to update post flag, but report saved", e);
  }

  // 3) Add/Update ONE shared admin inbox doc (no admin list, no hardcoding)
  const post = await getPostById(postId);
  const postTitle = post?.title ?? "A post";

  await upsertPostReportToAdminInbox({
    postId,
    reporterId: uid,
    reporterName,
    reporterPhotoURL,
    reason,
    postTitle,
  });
}


/** ------------------ ADMIN: GET REPORTED POSTS ------------------ **/
/** ------------------ ADMIN: GET REPORTED POSTS ------------------ **/
export async function adminGetReportedPosts() {
  const snap = await getDocs(collection(db, "posts"));

  const results: any[] = [];

  for (const postDoc of snap.docs) {
    const postId = postDoc.id;
    const postData = postDoc.data();

    // Load all reports for this post
    const reportsSnap = await getDocs(
      collection(db, "posts", postId, "reports")
    );

    if (reportsSnap.empty) continue; // skip unreported posts

    const reports = reportsSnap.docs.map((r) => ({
      id: r.id,
      ...(r.data() as any),
    }));

    // Group by reason
    const reasonCount: Record<string, number> = {};
    reports.forEach((r) => {
      reasonCount[r.reason] = (reasonCount[r.reason] || 0) + 1;
    });

    results.push({
      id: postId,
      ...postData,
      reportCount: reports.length,
      reports: reports,
      reasonCount,
    });
  }

  return results;
}


