// lib/member.ts

import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

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
