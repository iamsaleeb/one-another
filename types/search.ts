export type WhenFilter = "today" | "tomorrow" | "weekend";
export type TypeFilter = "all" | "events" | "churches";

export const WHEN_OPTIONS: Array<{ value: WhenFilter; label: string }> = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "weekend", label: "This Weekend" },
];

export const CATEGORY_OPTIONS = [
  "Youth Meeting",
  "Bible Study",
  "Servants Meeting",
  "Camp",
] as const;

export const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "events", label: "Events" },
  { value: "churches", label: "Churches" },
];

export const WHEN_LABELS: Record<WhenFilter, string> = {
  today: "Today",
  tomorrow: "Tomorrow",
  weekend: "This Weekend",
};

export const TYPE_LABELS: Record<string, string> = {
  events: "Events only",
  churches: "Churches only",
};

export const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};
