"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attendEventAction,
  unattendEventAction,
} from "@/domains/events/actions/attendance";

interface AttendButtonProps {
  eventId: string;
  isAttending: boolean;
  isAuthenticated: boolean;
  loginUrl: string;
}

export function AttendButton({
  eventId,
  isAttending,
  isAuthenticated,
  loginUrl,
}: AttendButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!isAuthenticated) {
      router.push(loginUrl);
      return;
    }
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
