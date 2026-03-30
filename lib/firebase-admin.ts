import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

export function getFirebaseAdmin(): { messaging: Messaging } {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      const missing = ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"]
        .filter((key) => !process.env[key])
        .join(", ");
      throw new Error(`Firebase Admin SDK is missing required environment variables: ${missing}`);
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, "\n"),
      }),
    });
  }
  return { messaging: getMessaging(getApp()) };
}
