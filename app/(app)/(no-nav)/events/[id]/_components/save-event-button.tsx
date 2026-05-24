"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { saveEventAction, unsaveEventAction } from "@/lib/actions/events-save";

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
        if (next) {
          await saveEventAction(eventId);
        } else {
          await unsaveEventAction(eventId);
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
      <Heart
        className={`size-5 transition-colors ${saved ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`}
      />
    </button>
  );
}
