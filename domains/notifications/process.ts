import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { getFirebaseAdmin } from "@/lib/firebase-admin";

const FCM_BATCH_SIZE = 500;
const CONCURRENCY = 20;

export async function processNotifications(): Promise<{ processed: number }> {
  const due = await prisma.notification.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      sentAt: null,
      cancelledAt: null,
    },
    orderBy: { scheduledFor: "asc" },
    take: 500,
  });

  if (due.length === 0) return { processed: 0 };

  const userIds = [...new Set(due.map((n) => n.userId))];

  const [optedOut, pushTokenRows] = await Promise.all([
    prisma.notificationPreference.findMany({
      where: { userId: { in: userIds }, enabled: false },
      select: { userId: true, type: true },
    }),
    prisma.pushToken.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, token: true },
    }),
  ]);

  const disabledSet = new Set(optedOut.map((p) => `${p.userId}:${p.type}`));
  const tokensByUser = new Map<string, string[]>();
  for (const pt of pushTokenRows) {
    const arr = tokensByUser.get(pt.userId) ?? [];
    arr.push(pt.token);
    tokensByUser.set(pt.userId, arr);
  }

  const { messaging } = getFirebaseAdmin();
  const sentIds: string[] = [];
  const staleTokens: string[] = [];

  for (let i = 0; i < due.length; i += CONCURRENCY) {
    const concurrentBatch = due.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      concurrentBatch.map(async (notif) => {
        const localSentIds: string[] = [];
        const localStaleTokens: string[] = [];

        if (disabledSet.has(`${notif.userId}:${notif.type}`)) {
          localSentIds.push(notif.id);
          return { localSentIds, localStaleTokens };
        }

        const tokens = tokensByUser.get(notif.userId) ?? [];
        if (tokens.length === 0) {
          localSentIds.push(notif.id);
          return { localSentIds, localStaleTokens };
        }

        const data =
          notif.data != null &&
          typeof notif.data === "object" &&
          !Array.isArray(notif.data)
            ? (notif.data as Record<string, string>)
            : undefined;

        try {
          for (let j = 0; j < tokens.length; j += FCM_BATCH_SIZE) {
            const tokenBatch = tokens.slice(j, j + FCM_BATCH_SIZE);
            const response = await messaging.sendEachForMulticast({
              tokens: tokenBatch,
              notification: { title: notif.title, body: notif.body },
              data: data ?? {},
            });

            response.responses.forEach((res, idx) => {
              if (!res.success) {
                const code = res.error?.code;
                if (
                  code === "messaging/invalid-registration-token" ||
                  code === "messaging/registration-token-not-registered" ||
                  code === "messaging/unregistered"
                ) {
                  localStaleTokens.push(tokenBatch[idx]);
                } else if (code === "messaging/mismatched-credential") {
                  console.error(
                    "FCM credential mismatch — check FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL env vars"
                  );
                }
              }
            });
          }
          localSentIds.push(notif.id);
        } catch (err) {
          console.error(
            `[process-notifications] failed to send notification ${notif.id}:`,
            err
          );
        }

        return { localSentIds, localStaleTokens };
      })
    );

    for (const { localSentIds, localStaleTokens } of batchResults) {
      sentIds.push(...localSentIds);
      staleTokens.push(...localStaleTokens);
    }
  }

  await Promise.all([
    sentIds.length > 0
      ? prisma.notification.updateMany({
          where: { id: { in: sentIds } },
          data: { sentAt: new Date() },
        })
      : Promise.resolve(),
    staleTokens.length > 0
      ? prisma.pushToken.deleteMany({ where: { token: { in: staleTokens } } })
      : Promise.resolve(),
  ]);

  for (const userId of userIds) {
    revalidateTag(`user-notifications-${userId}`, {});
  }

  return { processed: sentIds.length };
}
