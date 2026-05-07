import { prisma } from '@/lib/db';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function processNotifications(): Promise<{ processed: number }> {
  const due = await prisma.notification.findMany({
    where: { scheduledFor: { lte: new Date() }, sentAt: null, cancelledAt: null },
    orderBy: { scheduledFor: 'asc' },
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

  for (const notif of due) {
    if (disabledSet.has(`${notif.userId}:${notif.type}`)) {
      sentIds.push(notif.id);
      continue;
    }

    const tokens = tokensByUser.get(notif.userId) ?? [];
    if (tokens.length === 0) {
      sentIds.push(notif.id);
      continue;
    }

    const data =
      notif.data != null && typeof notif.data === 'object' && !Array.isArray(notif.data)
        ? (notif.data as Record<string, string>)
        : undefined;

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: { title: notif.title, body: notif.body },
        data: data ?? {},
      });

      response.responses.forEach((res, idx) => {
        if (!res.success) {
          const code = res.error?.code;
          if (
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/unregistered'
          ) {
            staleTokens.push(tokens[idx]);
          } else if (code === 'messaging/mismatched-credential') {
            console.error('FCM credential mismatch — check FIREBASE_PROJECT_ID and FIREBASE_CLIENT_EMAIL env vars');
          }
        }
      });

      sentIds.push(notif.id);
    } catch (err) {
      console.error(`[process-notifications] failed to send notification ${notif.id}:`, err);
    }
  }

  await Promise.all([
    sentIds.length > 0
      ? prisma.notification.updateMany({ where: { id: { in: sentIds } }, data: { sentAt: new Date() } })
      : Promise.resolve(),
    staleTokens.length > 0
      ? prisma.pushToken.deleteMany({ where: { token: { in: staleTokens } } })
      : Promise.resolve(),
  ]);

  return { processed: sentIds.length };
}
