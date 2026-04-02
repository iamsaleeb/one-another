import { cookies } from "next/headers";

export const DEFAULT_TIMEZONE = "Australia/Sydney";

function isValidTimezone(value: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export async function getUserTimezone(): Promise<string> {
  const cookieStore = await cookies();
  const value = cookieStore.get("user-timezone")?.value;
  return value && isValidTimezone(value) ? value : DEFAULT_TIMEZONE;
}
