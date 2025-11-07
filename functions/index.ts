import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {FirebaseFirestore} from "@firebase/firestore-types";

admin.initializeApp();
const db = admin.firestore();

/**
 * Every day at 9am UTC (adjust to your needs):
 * Create a "prompt" doc for any user who hasn't checked in last 24h.
 */
export const scheduleDailyCheckins = functions.pubsub
    .schedule("0 9 * * *")
    .timeZone("UTC")
    .onRun(async () => {
        const twentyFourHoursAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 24 * 60 * 60 * 1000)
        );

        const membersSnap = await db.collection("members").get();
        const batch = db.batch();

        for (const member of membersSnap.docs) {
            // find last checkin
            const lastSnap = await db
                .collection("checkins")
                .where("uid", "==", member.id)
                .orderBy("createdAt", "desc")
                .limit(1)
                .get();

            const needsPrompt =
                lastSnap.empty ||
                (lastSnap.docs[0].get("createdAt") as FirebaseFirestore.Timestamp) < twentyFourHoursAgo;

            if (needsPrompt) {
                const promptRef = db.collection("members").doc(member.id).collection("inbox").doc();
                batch.set(promptRef, {
                    type: "checkin_prompt",
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    read: false,
                });
            }
        }
        await batch.commit();
        return null;
    });
