import { z } from "zod";
import { NOTIFICATION_TYPES, NotificationType } from "../types";

const reminderHours =
  NOTIFICATION_TYPES.EVENT_REMINDER.config?.hoursBeforeEvent.options ?? [];

// One preference update. Only Event reminders carry a config, and its lead
// time must be one of the options the settings page offers.
export const notificationPreferenceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal(NotificationType.EVENT_REMINDER),
    enabled: z.boolean(),
    config: z
      .strictObject({
        hoursBeforeEvent: z
          .number()
          .refine((hours) => reminderHours.includes(hours)),
      })
      .optional(),
  }),
  z.object({
    type: z.enum(NotificationType).exclude([NotificationType.EVENT_REMINDER]),
    enabled: z.boolean(),
    config: z.undefined(),
  }),
]);
