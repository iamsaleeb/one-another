"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cancelEventAction } from "@/lib/actions/events";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    await cancelEventAction(eventId, reason.trim());
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Ban className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel Event</DialogTitle>
          <DialogDescription>
            The event will remain visible but marked as cancelled. Please provide a reason for attendees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Textarea
            placeholder="Reason for cancellation…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            required
          />
          <DialogFooter>
            <Button type="submit" variant="destructive" className="w-full" disabled={!reason.trim()}>
              Cancel Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
