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
import { parseEventAttendeeMetadata, type EventMetadata } from "@/lib/types/event-metadata";
import type { getEventAttendees } from "@/lib/actions/data-events";

interface AttendeesDrawerProps {
  attendees: Awaited<ReturnType<typeof getEventAttendees>>;
  requiresRegistration: boolean;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
}

function formatDayShort(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short" });
}

export function AttendeesDrawer({
  attendees,
  requiresRegistration,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
  camp,
  campStartDate,
}: AttendeesDrawerProps) {
  const count = attendees.length;
  const noun = requiresRegistration
    ? count === 1 ? "registrant" : "registrants"
    : count === 1 ? "attendee" : "attendees";

  const showDays = camp?.allowPartialRegistration === true && !!campStartDate && !!camp.endDate;

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
            attendees.map((a) => {
              const attendeeMeta = parseEventAttendeeMetadata(a.metadata);
              const selectedDays = attendeeMeta.selectedDays ?? [];

              return (
                <div key={a.id} className="rounded-xl bg-muted/50 px-4 py-3 flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{a.user.name}</p>
                  <p className="text-xs text-muted-foreground">{a.user.email}</p>
                  {collectPhone && a.phone && (
                    <p className="text-xs text-muted-foreground">{a.phone}</p>
                  )}
                  {collectNotes && a.notes && (
                    <p className="text-xs text-foreground/70 mt-1 italic">{a.notes}</p>
                  )}
                  {showDays && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      <p className="text-xs font-medium text-muted-foreground">Attending days:</p>
                      {selectedDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedDays.sort().map((day) => (
                            <span
                              key={day}
                              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                              {formatDayShort(day)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Full camp</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
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
