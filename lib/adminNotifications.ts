// lib/adminNotifications.ts  (shared admin inbox: ONE doc per post)
import { db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

function adminReportsCol() {
  return collection(db, "adminReports");
}

export async function upsertPostReportToAdminInbox(params: {
  postId: string;
  reporterId: string;
  reporterName: string;
  reporterPhotoURL?: string | null;
  reason: string;
  postTitle?: string | null;
}) {
  const reportId = params.postId;
  const ref = doc(db, "adminReports", reportId);

  await setDoc(
    ref,
    {
      type: "post_report",
      postId: params.postId,
      postTitle: params.postTitle ?? "A post",

      lastReporterId: params.reporterId,
      lastReporterName: params.reporterName,
      lastReporterPhotoURL: params.reporterPhotoURL ?? null,
      lastReason: params.reason,

      status: "open",
      lastReportedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),

      // reset reads when a new report comes in
      readBy: {},
    },
    { merge: true }
  );
}

export function listenOpenAdminReports(cb: (items: any[]) => void) {
  const q = query(
    adminReportsCol(),
    where("status", "==", "open"),
    where("type", "in", ["post_report", "member_report"]),
    orderBy("lastReportedAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      console.log("✅ adminReports snapshot size:", snap.size);
      cb(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    },
    (err) => {
      console.log("❌ listenOpenAdminReports error:", err);
      cb([]); // keep UI sane
    }
  );
}



export async function markAdminReportRead(reportId: string, adminUid: string) {
  const ref = doc(db, "adminReports", reportId);
  await updateDoc(ref, {
    [`readBy.${adminUid}`]: true,
    updatedAt: serverTimestamp(),
  });
}

export async function dismissAdminReport(reportId: string) {
  const ref = doc(db, "adminReports", reportId);
  await updateDoc(ref, {
    status: "dismissed",
    updatedAt: serverTimestamp(),
  });
}

export async function actionAdminReport(reportId: string) {
  const ref = doc(db, "adminReports", reportId);
  await updateDoc(ref, {
    status: "actioned",
    updatedAt: serverTimestamp(),
  });
}
