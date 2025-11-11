// lib/posts.ts
import { auth, db } from './firebase';
import {
  addDoc, collection, serverTimestamp, updateDoc, doc, getDoc, getDocs,
  query, where, limit, deleteDoc, DocumentData, QueryDocumentSnapshot,
  orderBy,            // ✅ add this
} from 'firebase/firestore';
import { getMemberProfile } from './member'; // ⬅️ add this
import { Post } from '../types/post';

// Reference to posts collection
const postsCol = collection(db, 'posts');

/** ------------------ CREATE ------------------ **/
export async function createPost(
  input: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'ownerId'>
) {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Not authenticated');

  const payload: any = {
    ...input,
    ownerId: uid,
    status: input.status ?? 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(postsCol, payload);
  return { id: docRef.id, ...payload } as Post;
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
export async function getPublicFeed(count = 50): Promise<Post[]> {
  try {
    const q = query(postsCol, orderBy('createdAt', 'desc'), limit(count));
    const snap = await getDocs(q);
    const posts = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as Post[];

    // 🔁 Fetch member profiles and merge authorName
    const enrichedPosts = await Promise.all(posts.map(async (post) => {
      const profile = post.ownerId ? await getMemberProfile(post.ownerId) : null;
      return {
        ...post,
        authorName: profile?.name ?? 'Member',
        authorCity: profile?.city ?? null,
        authorState: profile?.state ?? null,
      };
    }));

    return enrichedPosts;
  } catch (err) {
    console.error("❌ getPublicFeed failed:", err);
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
