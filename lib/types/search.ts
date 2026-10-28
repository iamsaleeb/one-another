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

export type Category = (typeof CATEGORY_OPTIONS)[number];

// `on` styles a selected filter toggle; Tailwind needs the full class names.
export const TAG_COLORS: Record<
  Category,
  { bg: string; text: string; on: string }
> = {
  "Youth Meeting": {
    bg: "bg-blue-100",
    text: "text-blue-700",
    on: "data-[state=on]:bg-blue-100 data-[state=on]:text-blue-700",
  },
  "Bible Study": {
    bg: "bg-purple-100",
    text: "text-purple-700",
    on: "data-[state=on]:bg-purple-100 data-[state=on]:text-purple-700",
  },
  "Servants Meeting": {
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    on: "data-[state=on]:bg-emerald-100 data-[state=on]:text-emerald-700",
  },
  Camp: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    on: "data-[state=on]:bg-orange-100 data-[state=on]:text-orange-700",
  },
};

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
