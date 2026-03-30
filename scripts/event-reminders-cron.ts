import cron from "node-cron";
import { prisma } from "../lib/db";
import { sendPushToUsers } from "../lib/notifications";
import type { NotificationTypeKey } from "../lib/notification-types";

const BATCH_SIZE = 100;

async function processScheduledNotifications(): Promise<void> {
  const due = await prisma.scheduledNotification.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      sentAt: null,
      cancelledAt: null,
    },
    take: BATCH_SIZE,
    orderBy: { scheduledFor: "asc" },
  });

  if (due.length === 0) return;

  for (const notification of due) {
    // Check if user has since opted out of this notification type.
    // Absent record means enabled (opt-out model).
    const pref = await prisma.notificationPreference.findUnique({
      where: { userId_type: { userId: notification.userId, type: notification.type } },
      select: { enabled: true },
    });

    if (pref?.enabled === false) {
      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { cancelledAt: new Date() },
      });
      continue;
    }

    const payload = notification.payload as {
      title: string;
      body: string;
      data: Record<string, string>;
    };

    await sendPushToUsers(
      [notification.userId],
      notification.type as NotificationTypeKey,
      payload.title,
      payload.body,
      payload.data
    );

    await prisma.scheduledNotification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });
  }

  console.log(`[${new Date().toISOString()}] Processed ${due.length} scheduled notification(s)`);
}

// Poll every minute.
// noOverlap prevents a new run starting if the previous one is still running.
cron.schedule(
  "*/1 * * * *",
  async () => {
    try {
      await processScheduledNotifications();
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Notification worker error:`, err);
    }
  },
  { noOverlap: true }
);

console.log("Notification worker started — polling every minute");
