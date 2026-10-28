"use client";

import { RotateCcw } from "lucide-react";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { uncancelEventAction } from "@/domains/events/actions/crud";

export function UncancelEventButton({ eventId }: { eventId: string }) {
  return (
    <ConfirmActionButton
      icon={RotateCcw}
      label="Restore event"
      title="Restore this event?"
      description="This will remove the cancellation and restore the event to active status."
      action={uncancelEventAction.bind(null, eventId)}
    />
  );
}
