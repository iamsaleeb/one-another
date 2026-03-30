"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import { NOTIFICATION_TYPES, type NotificationTypeKey } from "@/lib/notification-types";
import { updateReminderScheduleForUser } from "@/lib/schedule-notification";

export type NotificationPreferenceMap = {
  [K in NotificationTypeKey]: {
    enabled: boolean;
    config: K extends "EVENT_REMINDER" ? { hoursBeforeEvent: number } : undefined;
  };
};

/**
 * Get the current user's notification preferences, merged with registry defaults.
 * Absent record = enabled (opt-out model).
 */
export async function getNotificationPreferencesAction(): Promise<NotificationPreferenceMap> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const stored = await prisma.notificationPreference.findMany({
    where: { userId: session.user.id },
    select: { type: true, enabled: true, config: true },
  });

  const storedMap = Object.fromEntries(stored.map((p) => [p.type, p]));

  return Object.fromEntries(
    (Object.keys(NOTIFICATION_TYPES) as NotificationTypeKey[]).map((key) => {
      const stored = storedMap[key];
      const typeConfig = (NOTIFICATION_TYPES[key] as { config?: { hoursBeforeEvent: { default: number } } }).config;

      const defaultConfig = typeConfig
        ? { hoursBeforeEvent: typeConfig.hoursBeforeEvent.default }
        : undefined;

      const storedConfig = stored?.config as Record<string, unknown> | null;
      const resolvedConfig = defaultConfig
        ? {
            hoursBeforeEvent:
              typeof storedConfig?.hoursBeforeEvent === "number"
                ? storedConfig.hoursBeforeEvent
                : defaultConfig.hoursBeforeEvent,
          }
        : undefined;

      return [
        key,
        {
          enabled: stored ? stored.enabled : true,
          config: resolvedConfig,
        },
      ];
    })
  ) as NotificationPreferenceMap;
}

/**
 * Update (upsert) a single notification preference for the current user.
 * If changing EVENT_REMINDER hoursBeforeEvent, updates all pending scheduled reminders.
 */
export async function updateNotificationPreferenceAction(
  type: NotificationTypeKey,
  enabled: boolean,
  config?: Record<string, unknown>
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  if (!(type in NOTIFICATION_TYPES)) {
    return { error: "Invalid notification type" };
  }

  const jsonConfig = config as Prisma.InputJsonValue | undefined;
  await prisma.notificationPreference.upsert({
    where: { userId_type: { userId: session.user.id, type } },
    update: { enabled, config: jsonConfig },
    create: { userId: session.user.id, type, enabled, config: jsonConfig },
  });

  // If the user changed their EVENT_REMINDER timing, update pending scheduled notifications
  if (type === "EVENT_REMINDER" && typeof config?.hoursBeforeEvent === "number") {
    await updateReminderScheduleForUser(session.user.id, config.hoursBeforeEvent);
  }

  revalidatePath("/profile/notifications");
  return {};
}
