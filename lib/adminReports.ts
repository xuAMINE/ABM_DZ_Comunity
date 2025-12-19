// lib/adminReports.ts
import { db } from "./firebase";
import { collection, getDocs, orderBy, query, where, limit } from "firebase/firestore";

export async function adminGetReportedMembers(max = 100) {
  const q = query(
    collection(db, "adminReports"),
    where("type", "==", "member_report"),   // ✅ FIXED
    orderBy("lastReportedAt", "desc"),
    limit(max)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
