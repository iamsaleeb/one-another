"use client";

import { Users } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { getEventAttendees } from "@/lib/actions/data";

interface AttendeesDrawerProps {
  attendees: Awaited<ReturnType<typeof getEventAttendees>>;
  requiresRegistration: boolean;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendeesDrawer({
  attendees,
  requiresRegistration,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
}: AttendeesDrawerProps) {
  const count = attendees.length;
  const noun = requiresRegistration
    ? count === 1 ? "registrant" : "registrants"
    : count === 1 ? "attendee" : "attendees";

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{count} {noun}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
          {count === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <Users className="size-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">No one has signed up yet</p>
            </div>
          ) : (
            attendees.map((a) => (
              <div key={a.id} className="rounded-xl bg-muted/50 px-4 py-3 flex flex-col gap-0.5">
                <p className="text-sm font-semibold">{a.user.name}</p>
                <p className="text-xs text-muted-foreground">{a.user.email}</p>
                {collectPhone && a.phone && (
                  <p className="text-xs text-muted-foreground">{a.phone}</p>
                )}
                {collectNotes && a.notes && (
                  <p className="text-xs text-foreground/70 mt-1 italic">{a.notes}</p>
                )}
              </div>
            ))
          )}
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
