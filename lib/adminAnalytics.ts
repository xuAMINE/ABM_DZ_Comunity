// lib/adminAnalytics.ts
import { db } from "./firebase";
import {
  collection,
  getDocs,
  query,
  where,
  Timestamp,
  DocumentData,
} from "firebase/firestore";

type TimeRange = "day" | "week" | "month" | "year";

export type DashboardStats = {
  // totals
  totalPosts: number;
  totalMembers: number;

  // statuses
  approvedPosts: number;
  pendingPosts: number;
  rejectedPosts: number;

  // recent activity
  postsInRange: number;
  membersInRange: number;
  activeMembersInRange: number;

  // time-series for charts
  postsPerDay: { label: string; value: number }[];
  membersPerDay: { label: string; value: number }[];
  postsPerMonth: { label: string; value: number }[];
  membersPerMonth: { label: string; value: number }[];

  // category breakdown
  categories: { label: string; value: number }[];
};

// ---- helpers ----

function rangeToDays(range: TimeRange): number {
  switch (range) {
    case "day":
      return 1;
    case "week":
      return 7;
    case "month":
      return 30;
    case "year":
      return 365;
    default:
      return 30;
  }
}

function startTimestamp(daysBack: number) {
  return Timestamp.fromMillis(Date.now() - daysBack * 24 * 60 * 60 * 1000);
}

function formatDay(ts: Timestamp) {
  const d = ts.toDate();
  return `${d.getMonth() + 1}/${d.getDate()}`; // e.g. 4/27
}

function formatMonth(ts: Timestamp) {
  const d = ts.toDate();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`; // Apr 24
}

function inc(map: Map<string, number>, key: string) {
  map.set(key, (map.get(key) ?? 0) + 1);
}

// ---- MAIN: load analytics for a time range ----

export async function getDashboardStats(range: TimeRange): Promise<DashboardStats> {
  const daysBack = rangeToDays(range);
  const since = startTimestamp(daysBack);

  // 1) basic totals (cheap enough for now)
  const [postsSnap, membersSnap] = await Promise.all([
    getDocs(collection(db, "posts")),
    getDocs(collection(db, "members")),
  ]);

  const totalPosts = postsSnap.size;
  const totalMembers = membersSnap.size;

  // status split
  let approvedPosts = 0;
  let pendingPosts = 0;
  let rejectedPosts = 0;

  // time-series maps
  const postsDayMap = new Map<string, number>();
  const postsMonthMap = new Map<string, number>();
  const catMap = new Map<string, number>();

  let postsInRange = 0;

  postsSnap.forEach((docSnap) => {
    const data = docSnap.data() as DocumentData;
    const status = data.status as string | undefined;
    if (status === "approved") approvedPosts++;
    else if (status === "pending") pendingPosts++;
    else if (status === "rejected") rejectedPosts++;

    const createdAt = data.createdAt as Timestamp | undefined;
    if (!createdAt) return;

    if (createdAt.toMillis() >= since.toMillis()) {
      postsInRange++;

      const dayKey = formatDay(createdAt);
      const monthKey = formatMonth(createdAt);
      inc(postsDayMap, dayKey);
      inc(postsMonthMap, monthKey);
    }

    const category = (data.category as string | undefined) ?? "other";
    inc(catMap, category);
  });

  // members time-series
  const membersDayMap = new Map<string, number>();
  const membersMonthMap = new Map<string, number>();
  let membersInRange = 0;
  let activeMembersInRange = 0;

  const activeSince = startTimestamp(Math.min(daysBack, 1)); // last 24h for "active"

  membersSnap.forEach((docSnap) => {
    const data = docSnap.data() as DocumentData;
    const createdAt = data.createdAt as Timestamp | undefined;
    const lastCheckIn = data.lastCheckIn as Timestamp | undefined;

    if (createdAt && createdAt.toMillis() >= since.toMillis()) {
      membersInRange++;
      const dayKey = formatDay(createdAt);
      const monthKey = formatMonth(createdAt);
      inc(membersDayMap, dayKey);
      inc(membersMonthMap, monthKey);
    }

    if (lastCheckIn && lastCheckIn.toMillis() >= activeSince.toMillis()) {
      activeMembersInRange++;
    }
  });

  // convert maps to sorted arrays
  const postsPerDay = Array.from(postsDayMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));
  const membersPerDay = Array.from(membersDayMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));
  const postsPerMonth = Array.from(postsMonthMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));
  const membersPerMonth = Array.from(membersMonthMap.entries()).map(
    ([label, value]) => ({
      label,
      value,
    })
  );
  const categories = Array.from(catMap.entries()).map(([label, value]) => ({
    label,
    value,
  }));

  // (optional: sort by label – simple approach)
  const byLabel = (a: { label: string }, b: { label: string }) =>
    a.label.localeCompare(b.label);

  postsPerDay.sort(byLabel);
  membersPerDay.sort(byLabel);
  postsPerMonth.sort(byLabel);
  membersPerMonth.sort(byLabel);

  return {
    totalPosts,
    totalMembers,
    approvedPosts,
    pendingPosts,
    rejectedPosts,
    postsInRange,
    membersInRange,
    activeMembersInRange,
    postsPerDay,
    membersPerDay,
    postsPerMonth,
    membersPerMonth,
    categories,
  };
}
