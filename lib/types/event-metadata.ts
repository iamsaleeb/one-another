export interface EventMetadata {
  registration: {
    capacity: number | null;
    collectPhone: boolean;
    collectNotes: boolean;
  };
}

export function parseEventMetadata(raw: unknown): EventMetadata {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const reg =
    obj.registration &&
    typeof obj.registration === "object" &&
    !Array.isArray(obj.registration)
      ? (obj.registration as Record<string, unknown>)
      : {};
  return {
    registration: {
      capacity: typeof reg.capacity === "number" ? reg.capacity : null,
      collectPhone:
        typeof reg.collectPhone === "boolean" ? reg.collectPhone : false,
      collectNotes:
        typeof reg.collectNotes === "boolean" ? reg.collectNotes : false,
    },
  };
}
