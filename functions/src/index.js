const admin = require("firebase-admin");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");

admin.initializeApp();

/**
 * Called by the app when user taps "Deactivate".
 * Writes server-time timestamps.
 */
exports.scheduleAccountDeletion = onCall(async (request) => {
  if (!request.auth || !request.auth.uid) {
    throw new HttpsError("unauthenticated", "Must be signed in.");
  }

  const uid = request.auth.uid;
  const db = admin.firestore();

  const now = admin.firestore.Timestamp.now();
  const deleteAfter = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 7 * 24 * 60 * 60 * 1000,
  );

  await db.collection("members").doc(uid).set(
      {
        status: "pending_delete",
        isActive: false,
        deactivatedAt: now,
        deleteAfter: deleteAfter,
      },
      {merge: true},
  );

  return {ok: true};
});

/**
 * Runs once a day. Deletes users whose deleteAfter has passed.
 */
exports.deleteDeactivatedUsers = onSchedule("every 24 hours", async () => {
  const db = admin.firestore();
  const now = admin.firestore.Timestamp.now();

  const snap = await db
      .collection("members")
      .where("status", "==", "pending_delete")
      .where("deleteAfter", "<=", now)
      .get();

  for (const docSnap of snap.docs) {
    const uid = docSnap.id;

    await admin.auth().deleteUser(uid);
    await docSnap.ref.delete();
  }
});
