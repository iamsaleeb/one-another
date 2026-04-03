"use client";

import { formatEventDatetime } from "@/lib/datetime";

/**
 * Renders a datetime string formatted in the user's local browser timezone.
 * `suppressHydrationWarning` is set so that the SSR-rendered value (server
 * timezone) is silently replaced by the correct client value on hydration.
 */
export function EventDatetime({ datetime }: { datetime: Date }) {
  return (
    <span suppressHydrationWarning>
      {formatEventDatetime(datetime)}
    </span>
  );
}
