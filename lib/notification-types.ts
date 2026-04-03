export const NOTIFICATION_TYPES = {
  EVENT_REMINDER: {
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
  NEW_SERIES_SESSION: {
    label: "New Series Sessions",
    description: "Get notified when a new session is added to a series you follow",
    defaultEnabled: true,
  },
  EVENT_CANCELLED: {
    label: "Event Cancellations",
    description: "Get notified when an event you're attending is cancelled",
    defaultEnabled: true,
  },
} as const;

export type NotificationTypeKey = keyof typeof NOTIFICATION_TYPES;
