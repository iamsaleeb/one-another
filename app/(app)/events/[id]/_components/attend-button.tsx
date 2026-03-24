"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { attendEventAction, unattendEventAction } from "@/lib/actions/events";

interface AttendButtonProps {
  eventId: string;
  isAttending: boolean;
}

export function AttendButton({ eventId, isAttending }: AttendButtonProps) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      if (isAttending) {
        await unattendEventAction(eventId);
      } else {
        await attendEventAction(eventId);
      }
    });
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isAttending ? "outline" : "default"}
      className={isAttending ? "gap-1.5" : ""}
    >
      {isAttending && <Check className="size-4" />}
      {isPending ? "..." : isAttending ? "Attending" : "Attend"}
    </Button>
  );
}
