"use client";

import { Trash2 } from "lucide-react";
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
import { deleteEventAction } from "@/lib/actions/events-crud";

export function DeleteEventButton({ eventId }: { eventId: string }) {
  const action = deleteEventAction.bind(null, eventId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Event</DialogTitle>
          <DialogDescription>
            Are you sure? This event will be permanently deleted and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <form action={action}>
            <Button type="submit" variant="destructive" className="w-full">
              Delete Event
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
