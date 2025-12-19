// lib/member.ts
import { db, auth } from "./firebase";
import {
  doc,
  getDoc,
  collection,
  limit,
  orderBy,
  query,
  startAt,
  endAt,
  getDocs,
  setDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";


import { MemberProfile } from "@/types/member";

// ✅ keep your existing getMemberProfile exactly as you already have it
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

// ✅ keep your existing searchMembersByName exactly as you already have it
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

/* ---------------------------------------------------- */
/*                 ✅ NEW: REPORT MEMBER                 */
/*  Works with your current rules because it does NO READ */
/*  on adminReports (only writes).                       */
/* ---------------------------------------------------- */
export async function reportMember(
  targetUid: string,
  reason: string,
  details?: string
) {
  const reporterUid = auth.currentUser?.uid;
  if (!reporterUid) throw new Error("Not authenticated");
  if (!targetUid) throw new Error("Missing target member");
  if (targetUid === reporterUid) throw new Error("You cannot report yourself");

  const reporterProfile = await getMemberProfile(reporterUid);
  const reporterName =
    reporterProfile?.fullName ||
    auth.currentUser?.displayName ||
    auth.currentUser?.email ||
    "Member";
  const reporterPhotoURL =
    reporterProfile?.photoURL || auth.currentUser?.photoURL || null;

  const targetProfile = await getMemberProfile(targetUid);
  const targetName = targetProfile?.fullName || "Unknown Member";
  const targetPhotoURL = targetProfile?.photoURL ?? null;
  const targetCity = targetProfile?.city ?? null;
  const targetState = targetProfile?.state ?? null;

  const reportId = `member_${targetUid}`;
  const ref = doc(db, "adminReports", reportId);

  await setDoc(
    ref,
    {
      type: "member_report",  // 👈 IMPORTANT

      memberUid: targetUid,
      memberName: targetName,
      memberPhotoURL: targetPhotoURL,
      memberCity: targetCity,
      memberState: targetState,

      lastReporterId: reporterUid,
      lastReporterName: reporterName,
      lastReporterPhotoURL: reporterPhotoURL,
      lastReason: reason,

      status: "open",         // 👈 IMPORTANT
      lastReportedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      readBy: {},             // 👈 IMPORTANT

      totalReports: increment(1),
      [`reasonCounts.${reason}`]: increment(1),
      [`reporters.${reporterUid}`]: {
        reporterUid,
        reporterName,
        reporterPhotoURL,
        reason,
        details: details?.trim() || null,
        updatedAt: serverTimestamp(),
      },
    },
    { merge: true }
  );
}
