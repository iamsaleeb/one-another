"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { updateTag, revalidatePath } from "next/cache";
import { type Prisma } from "@prisma/client";
import { NOTIFICATION_TYPES, type NotificationTypeKey } from "@/lib/notification-types";
import { updateUserReminderSchedule } from "@/lib/notifications/queue";
import { markNotificationsRead } from "@/lib/notifications/inbox";
import { getStoredNotificationPreferences } from "@/lib/actions/data-user";

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

  const stored = await getStoredNotificationPreferences(session.user.id);

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

  if (enabled && !config) {
    // Nothing non-default to persist — delete the row so absence correctly
    // signals "enabled" (true opt-out model). deleteMany is a no-op when absent.
    await prisma.notificationPreference.deleteMany({
      where: { userId: session.user.id, type },
    });
  } else {
    // Disabled, or re-enabled with a custom config (e.g. hoursBeforeEvent) that
    // needs to be remembered — persist the row.
    const jsonConfig = config as Prisma.InputJsonValue | undefined;
    await prisma.notificationPreference.upsert({
      where: { userId_type: { userId: session.user.id, type } },
      update: { enabled, config: jsonConfig },
      create: { userId: session.user.id, type, enabled, config: jsonConfig },
    });
  }

  // If the user changed their EVENT_REMINDER timing, update pending scheduled notifications
  if (type === "EVENT_REMINDER" && typeof config?.hoursBeforeEvent === "number") {
    await updateUserReminderSchedule(session.user.id, config.hoursBeforeEvent);
  }

  updateTag(`user-notifications-${session.user.id}`);
  return {};
}

export async function markReadAction(): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  await markNotificationsRead(session.user.id);
  updateTag(`user-notifications-${session.user.id}`);
  revalidatePath("/", "layout");
}
