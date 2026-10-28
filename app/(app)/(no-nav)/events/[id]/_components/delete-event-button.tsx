"use client";

import { Trash2 } from "lucide-react";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { deleteEventAction } from "@/domains/events/actions/crud";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  return (
    <ConfirmActionButton
      icon={Trash2}
      label="Delete event"
      title="Delete this event?"
      description="This event will be permanently deleted and cannot be undone."
      destructive
      action={deleteEventAction.bind(null, eventId)}
    />
  );
}
