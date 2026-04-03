import { prisma } from "@/lib/db";
import { getFirebaseAdmin } from "@/lib/firebase-admin";
import type { NotificationTypeKey } from "@/lib/notification-types";

const BATCH_SIZE = 500;

/**
 * Send a push notification to a set of users.
 * Automatically filters out users who have opted out of this notification type.
 * Cleans up stale FCM tokens on failed sends.
 */
export async function sendPushToUsers(
  userIds: string[],
  notificationType: NotificationTypeKey,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<void> {
  if (userIds.length === 0) return;

  // Filter out users who have explicitly disabled this notification type
  const optedOut = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds }, type: notificationType, enabled: false },
    select: { userId: true },
  });
  const disabledIds = new Set(optedOut.map((p) => p.userId));
  const targetIds = userIds.filter((id) => !disabledIds.has(id));

  if (targetIds.length === 0) {
    return;
  }

  const tokens = await prisma.pushToken.findMany({
    where: { userId: { in: targetIds } },
    select: { token: true },
  });

  if (tokens.length === 0) {
    return;
  }

  const tokenStrings = tokens.map((t) => t.token);
  const { messaging } = getFirebaseAdmin();

  for (let i = 0; i < tokenStrings.length; i += BATCH_SIZE) {
    const batch = tokenStrings.slice(i, i + BATCH_SIZE);

    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: data ?? {},
    });

    const staleTokens: string[] = [];
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const code = res.error?.code;
        if (
          code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered" ||
          code === "messaging/unregistered"
        ) {
          staleTokens.push(batch[idx]);
        } else if (code === "messaging/mismatched-credential") {
          // Configuration error — the Firebase credential doesn't match this project.
          // Log loudly; do not delete the token as that would mask the misconfiguration.
          console.error("FCM credential mismatch — check FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL env vars");
        }
      }
    });

    if (staleTokens.length > 0) {
      await prisma.pushToken.deleteMany({
        where: { token: { in: staleTokens } },
      });
    }
  }
}
