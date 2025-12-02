// lib/member.ts

import { db } from './firebase';
import {doc, getDoc, collection, limit, orderBy, query, startAt, endAt, getDocs,} from 'firebase/firestore';

export async function getMemberProfile(uid: string) {
  try {
    const snap = await getDoc(doc(db, 'members', uid));
    if (!snap.exists()) return null;
    return { uid, ...snap.data() };
  } catch (err) {
    console.error(`❌ Failed to fetch member profile for ${uid}:`, err);
    return null;
  }
}

export interface MemberSummary {
  uid: string;
  fullName: string;
  fullNameLower: string;
  city?: string;
  state?: string;
  photoURL?: string | null;
}

export async function searchMembersByName(
    term: string,
    maxResults = 20
): Promise<MemberSummary[]> {
  if (!term.trim()) return [];
  const search = term.toLowerCase();

  const q = query(
      collection(db, "members"),
      orderBy("fullNameLower"),
      startAt(search),
      endAt(search + "\uf8ff"),
      limit(maxResults)
  );

  const snap = await getDocs(q);
  const result: MemberSummary[] = [];
  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    result.push({
      uid: docSnap.id,
      fullName: data.fullName ?? "",
      fullNameLower: data.fullNameLower ?? "",
      city: data.city,
      state: data.state,
      photoURL: data.photoURL ?? null,
    });
  });
  return result;
}