import { prisma } from '@/lib/db';
import { sendPushToUsers } from '@/lib/notifications';
import type { NotificationTypeKey } from '@/lib/notification-types';

export async function processNotifications(): Promise<{ processed: number }> {
  const due = await prisma.notification.findMany({
    where: { scheduledFor: { lte: new Date() }, sentAt: null, cancelledAt: null },
    orderBy: { scheduledFor: 'asc' },
    take: 500,
  });

  if (due.length === 0) return { processed: 0 };

  const results = await Promise.allSettled(
    due.map(async (notif) => {
      const data =
        notif.data != null && typeof notif.data === 'object' && !Array.isArray(notif.data)
          ? (notif.data as Record<string, string>)
          : undefined;
      await sendPushToUsers(
        [notif.userId],
        notif.type as NotificationTypeKey,
        notif.title,
        notif.body,
        data
      );
      await prisma.notification.update({
        where: { id: notif.id },
        data: { sentAt: new Date() },
      });
    })
  );

  const processed = results.filter((r) => r.status === 'fulfilled').length;
  return { processed };
}
