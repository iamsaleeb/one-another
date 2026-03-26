"use client";

import { RotateCcw } from "lucide-react";
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
import { uncancelEventAction } from "@/lib/actions/events";

export function UncancelEventButton({ eventId }: { eventId: string }) {
  const action = uncancelEventAction.bind(null, eventId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9">
          <RotateCcw className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restore Event</DialogTitle>
          <DialogDescription>
            This will remove the cancellation and restore the event to active status.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <form action={action}>
            <Button type="submit" className="w-full">
              Restore Event
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
