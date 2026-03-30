import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

export function getFirebaseAdmin(): { messaging: Messaging } {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return { messaging: getMessaging(getApp()) };
}
