import { NotificationType } from "@prisma/client";

export { NotificationType };

export const NOTIFICATION_TYPES: Record<
  NotificationType,
  {
    label: string;
    description: string;
    defaultEnabled: boolean;
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
    defaultEnabled: true,
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
    defaultEnabled: true,
  },
  [NotificationType.EVENT_CANCELLED]: {
    label: "Event Cancellations",
    description: "Get notified when an event you're attending is cancelled",
    defaultEnabled: true,
  },
  [NotificationType.ROLE_REQUEST_RECEIVED]: {
    label: "Help Requests",
    description:
      "Get notified when someone requests to help with your event, series, or church",
    defaultEnabled: true,
  },
  [NotificationType.ROLE_REQUEST_OUTCOME]: {
    label: "Help Request Outcomes",
    description:
      "Get notified when your request to help has been approved or denied",
    defaultEnabled: true,
  },
};

export type NotificationTypeKey = NotificationType;
