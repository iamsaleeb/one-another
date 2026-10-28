"use client";

import { useCallback, useSyncExternalStore } from "react";
import { isLive } from "@/domains/events/lib/timing";

interface LiveBadgeProps {
  event: Parameters<typeof isLive>[0];
  // Shown instead when the Event is not Live.
  children?: React.ReactNode;
}

// Shows "Live" from an Event's start until its end. It is decided in the
// browser, so a cached page or card is still right, and it flips at the start
// and the end while the page is open. The server renders it as not Live.
export function LiveBadge({ event, children = null }: LiveBadgeProps) {
  const start = event.datetime?.getTime();
  const end = event.endDatetime?.getTime();

  const subscribe = useCallback(
    (notify: () => void) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const scheduleNext = () => {
        const now = Date.now();
        const next = [start, end]
          .filter((t): t is number => t !== undefined && t > now)
          .sort((a, b) => a - b)[0];
        if (next === undefined) return;
        // setTimeout overflows past ~24.8 days; it then just re-checks.
        timer = setTimeout(
          () => {
            notify();
            scheduleNext();
          },
          Math.min(next - now + 1, 2 ** 31 - 1)
        );
      };
      scheduleNext();
      return () => clearTimeout(timer);
    },
    [start, end]
  );

  const live = useSyncExternalStore(
    subscribe,
    () => isLive(event),
    () => false
  );

  if (!live) return children;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-red-700">
      <span className="size-1.5 animate-pulse rounded-full bg-red-600" />
      Live
    </span>
  );
}
