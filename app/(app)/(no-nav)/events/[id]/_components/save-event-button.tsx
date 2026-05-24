"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
      router.push("/login");
      return;
    }
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      if (next) {
        await saveEventAction(eventId);
      } else {
        await unsaveEventAction(eventId);
      }
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={saved ? "default" : "outline"}
      className="flex-1 gap-2"
    >
      {saved ? (
        <BookmarkCheck className="size-4" />
      ) : (
        <Bookmark className="size-4" />
      )}
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
