import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendPushToUsers } from "@/lib/notifications";
import type { NotificationTypeKey } from "@/lib/notification-types";

const BATCH_SIZE = 100;

async function processScheduledNotifications(): Promise<number> {
  const due = await prisma.scheduledNotification.findMany({
    where: {
      scheduledFor: { lte: new Date() },
      sentAt: null,
      cancelledAt: null,
    },
    take: BATCH_SIZE,
    orderBy: { scheduledFor: "asc" },
  });

  if (due.length === 0) return 0;

  for (const notification of due) {
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

  return due.length;
}

export async function GET(request: NextRequest) {
  // Validate the secret so only cron-job.org (with the correct token) can trigger this.
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET;

  if (!expectedToken) {
    console.error("CRON_SECRET environment variable is not set");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const processed = await processScheduledNotifications();
    console.log(`[${new Date().toISOString()}] Processed ${processed} scheduled notification(s)`);
    return NextResponse.json({ ok: true, processed });
  } catch (err) {
    console.error(`[${new Date().toISOString()}] Notification cron error:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
