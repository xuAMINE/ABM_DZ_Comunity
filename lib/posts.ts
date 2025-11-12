// lib/posts.ts
import { auth, db } from './firebase';
import {
  addDoc, collection, serverTimestamp, updateDoc, doc, getDoc, getDocs,
  query, where, limit, deleteDoc, DocumentData, QueryDocumentSnapshot,
  orderBy,            // ✅ add this
} from 'firebase/firestore';
import { getMemberProfile } from './member'; // ⬅️ add this
import { Post } from '../types/post';


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
export async function createPost(
  input: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'ownerId'>
): Promise<AugmentedPost> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  // Strongly type the profile so TS knows fullName/city/state exist
  const profile = (await getMemberProfile(uid)) as MemberProfile | null;

  const payload: any = {
    ...input,
    ownerId: uid,
    status: input.status ?? 'pending',

    // Denormalized author fields (fast reads)
    authorId: uid,
    authorName: profile?.fullName ?? 'Member',
    authorCity: profile?.city ?? null,
    authorState: profile?.state ?? null,

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(collection(db, 'posts'), payload);
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
    // newest first
    const q = query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);

    // Start with what’s in Firestore
    const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as AugmentedPost[];

    // Fast path: if a post already has authorName, use it.
    // Fallback: hydrate from the member profile (older posts).
    const needsHydration = posts.filter(p => !p.authorName);

    if (needsHydration.length > 0) {
      // Prefer ownerId (your schema), fallback to authorId
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

      // Merge author fields into posts that were missing them
      for (const p of posts) {
        if (!p.authorName) {
          const uid = getUid(p);
          const prof = (uid && cache.get(uid)) || null;
          p.authorId = p.authorId ?? uid ?? null;
          p.authorName = prof?.fullName ?? 'Member';
          p.authorCity = prof?.city ?? null;
          p.authorState = prof?.state ?? null;
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
