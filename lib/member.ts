// lib/member.ts

import { db } from './firebase';
import {doc, getDoc, collection, limit, orderBy, query, startAt, endAt, getDocs,} from 'firebase/firestore';

import { MemberProfile } from "@/types/member";

export async function getMemberProfile(uid: string): Promise<MemberProfile | null> {
  const snap = await getDoc(doc(db, "members", uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    uid,
    fullName: data.fullName ?? "Unknown User",
    city: data.city,
    state: data.state,
    zip: data.zip,
    phone: data.phone,
    photoURL: data.photoURL ?? null,
    groupId: data.groupId,
    role: data.role,
    status: data.status,
  };
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