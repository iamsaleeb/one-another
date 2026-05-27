"use cache: remote";

import { cacheTag, cacheLife } from "next/cache";
import { prisma } from "@/lib/db";

export async function getCachedUnreadCount(userId: string): Promise<number> {
  cacheTag(`user-notifications-${userId}`);
  cacheLife("minutes");
  return prisma.notification.count({
    where: { userId, sentAt: { not: null }, readAt: null },
  });
}
