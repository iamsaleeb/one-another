import "server-only";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

export interface PushMessage {
  title: string;
  body: string;
  data: Record<string, string>;
}

// Per token: delivered, gone for good (prune it), or failed this time.
export type TokenResult = "ok" | "stale" | "failed";

// Sends one message to a user's devices and reports each token, in order.
// Throws only when nothing could be attempted at all.
export interface PushSender {
  send(tokens: string[], message: PushMessage): Promise<TokenResult[]>;
}

// FCM's multicast limit.
const FCM_BATCH_SIZE = 500;

const STALE_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
  "messaging/unregistered",
]);

export const firebaseSender: PushSender = {
  async send(tokens, { title, body, data }) {
    const { messaging } = getFirebaseAdmin();
    const results: TokenResult[] = [];
    for (let i = 0; i < tokens.length; i += FCM_BATCH_SIZE) {
      const response = await messaging.sendEachForMulticast({
        tokens: tokens.slice(i, i + FCM_BATCH_SIZE),
        notification: { title, body },
        data,
      });
      for (const res of response.responses) {
        const code = res.error?.code;
        if (res.success) results.push("ok");
        else if (code && STALE_CODES.has(code)) results.push("stale");
        else {
          if (code === "messaging/mismatched-credential") {
            console.error(
              "FCM credential mismatch — check FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL env vars"
            );
          }
          results.push("failed");
        }
      }
    }
    return results;
  },
};
