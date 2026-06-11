"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark } from "lucide-react";
import {
  saveEventAction,
  unsaveEventAction,
} from "@/domains/events/actions/save";

interface SaveEventButtonProps {
  eventId: string;
  initialSaved: boolean;
  isAuthenticated: boolean;
}

export function SaveEventButton({
  eventId,
  initialSaved,
  isAuthenticated,
}: SaveEventButtonProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(`/login?callbackUrl=/events/${eventId}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      try {
        const result = next
          ? await saveEventAction(eventId)
          : await unsaveEventAction(eventId);
        if (result.error) {
          setSaved(!next);
          if (result.error === "You must be signed in.") {
            router.push(`/login?callbackUrl=/events/${eventId}`);
          }
        }
      } catch {
        setSaved(!next);
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={saved ? "Unsave event" : "Save event"}
      className="p-1 disabled:opacity-50"
      type="button"
    >
      <Bookmark
        className={`size-5 transition-colors ${saved ? "fill-foreground text-foreground" : "text-muted-foreground"}`}
      />
    </button>
  );
}
