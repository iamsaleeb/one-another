"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { CalendarDays } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import type { EventCardItem, LoadMoreFn } from "@/types/pagination";

interface InfiniteEventListProps {
  initialItems: EventCardItem[];
  initialCursor: string | null;
  loadMore: LoadMoreFn;
  title?: string;
  emptyMessage?: string;
}

export function InfiniteEventList({
  initialItems,
  initialCursor,
  loadMore,
  title,
  emptyMessage = "No events",
}: InfiniteEventListProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [isPending, startTransition] = useTransition();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef(initialCursor);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  useEffect(() => {
    if (!cursor) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current || !cursorRef.current)
          return;
        loadingRef.current = true;
        const currentCursor = cursorRef.current;
        startTransition(async () => {
          const result = await loadMore(currentCursor);
          setItems((prev) => [...prev, ...result.items]);
          setCursor(result.nextCursor);
          cursorRef.current = result.nextCursor;
          loadingRef.current = false;
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.unobserve(sentinel);
  }, [cursor, loadMore]);

  if (items.length === 0 && !cursor) {
    return <EmptyState icon={CalendarDays} label={emptyMessage} />;
  }

  return (
    <section className="flex flex-col gap-3">
      {title && <h2 className="text-base font-semibold">{title}</h2>}
      {items.map((item) => (
        <EventCard
          key={item.id}
          event={{
            ...item,
            badge: item.tag,
            churchName: item.church?.name ?? "",
          }}
        />
      ))}
      {cursor && (
        <div ref={sentinelRef}>
          {isPending && <Skeleton className="h-24 w-full rounded-2xl" />}
        </div>
      )}
    </section>
  );
}
