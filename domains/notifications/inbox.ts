import "server-only";
import { prisma } from "@/lib/db";

export interface InboxNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  sentAt: string;
  readAt: string | null;
}

export async function getInboxNotifications(input: {
  userId: string;
  page: number;
  pageSize: number;
}): Promise<InboxNotification[]> {
  const { userId, page, pageSize } = input;
  const rows = await prisma.notification.findMany({
    where: { userId, sentAt: { not: null } },
    orderBy: { sentAt: "desc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      sentAt: true,
      readAt: true,
    },
  });
  return rows.map((n) => ({
    ...n,
    sentAt: (n.sentAt as Date).toISOString(),
    readAt: n.readAt?.toISOString() ?? null,
  }));
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, sentAt: { not: null }, readAt: null },
  });
}

export async function markNotificationsRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, sentAt: { not: null }, readAt: null },
    data: { readAt: new Date() },
  });
}
