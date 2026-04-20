"use client";

import Link from "next/link";
import { CalendarPlus, Plus, X, Repeat } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useIsDetailPage } from "@/hooks/use-is-detail-page";

export function CreateEventFAB({ isOrganiser }: { isOrganiser: boolean }) {
  const isDetailPage = useIsDetailPage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!isOrganiser || isDetailPage) return null;

  return (
    <div ref={containerRef} className="fixed bottom-nav-fab right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <>
          <Link
            href="/series/create"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Repeat className="size-4 text-primary" />
            New Series
          </Link>
          <Link
            href="/events/create"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-medium shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <CalendarPlus className="size-4 text-primary" />
            New Event
          </Link>
        </>
      )}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? "Close menu" : "Create new"}
        className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X className="size-6" /> : <Plus className="size-6" />}
      </button>
    </div>
  );
}
