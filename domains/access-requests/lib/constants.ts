import type { ResourceType } from "@prisma/client";

export const RESOURCE_PATHS: Record<ResourceType, string> = {
  EVENT: "events",
  SERIES: "series",
  CHURCH: "churches",
};
