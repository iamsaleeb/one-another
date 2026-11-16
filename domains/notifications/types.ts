import { NotificationType } from "@prisma/client";

export { NotificationType };

export const NOTIFICATION_TYPES: Record<
  NotificationType,
  {
    label: string;
    description: string;
    config?: {
      hoursBeforeEvent: {
        label: string;
        options: readonly number[];
        optionLabels: Record<number, string>;
        default: number;
      };
    };
  }
> = {
  [NotificationType.EVENT_REMINDER]: {
    label: "Event Reminders",
    description: "Get notified before events you're attending start",
    config: {
      hoursBeforeEvent: {
        label: "How far in advance",
        options: [1, 2, 4, 24] as const,
        optionLabels: {
          1: "1 hour before",
          2: "2 hours before",
          4: "4 hours before",
          24: "1 day before",
        },
        default: 2,
      },
    },
  },
  [NotificationType.NEW_SERIES_SESSION]: {
    label: "New Series Sessions",
    description:
      "Get notified when a new session is added to a series you follow",
  },
  [NotificationType.EVENT_CANCELLED]: {
    label: "Event Cancellations",
    description: "Get notified when an event you're attending is cancelled",
  },
  [NotificationType.ROLE_REQUEST_RECEIVED]: {
    label: "Role Requests Received",
    description: "Get notified when someone requests a role in your group",
  },
  [NotificationType.ROLE_REQUEST_OUTCOME]: {
    label: "Role Request Outcomes",
    description: "Get notified when your role request is approved or denied",
  },
};

export type NotificationTypeKey = NotificationType;
