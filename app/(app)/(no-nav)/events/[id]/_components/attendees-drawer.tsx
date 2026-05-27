"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import {
  parseEventAttendeeMetadata,
  type EventMetadata,
} from "@/domains/events/validations/event";
import type { getEventAttendees } from "@/domains/events/actions/data";
import { formatDayShort } from "@/lib/datetime";

interface AttendeesDrawerProps {
  attendees: Awaited<ReturnType<typeof getEventAttendees>>;
  requiresRegistration: boolean;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  questionCount?: number;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
}

export function AttendeesDrawer({
  attendees,
  requiresRegistration,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
  questionCount,
  camp,
  campStartDate,
}: AttendeesDrawerProps) {
  const count = attendees.length;
  const noun = requiresRegistration
    ? count === 1
      ? "registrant"
      : "registrants"
    : count === 1
      ? "attendee"
      : "attendees";

  const showDays =
    camp?.allowPartialRegistration === true &&
    !!campStartDate &&
    !!camp.endDate;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>
            {count} {noun}
          </DrawerTitle>
        </DrawerHeader>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto px-4 pb-2">
          {count === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="bg-muted flex size-12 items-center justify-center rounded-full">
                <Users className="text-muted-foreground size-6" />
              </div>
              <p className="text-muted-foreground text-center text-sm">
                No one has signed up yet
              </p>
            </div>
          ) : (
            attendees.map((a) => {
              const attendeeMeta = parseEventAttendeeMetadata(a.metadata);
              const selectedDays = attendeeMeta.selectedDays ?? [];

              return (
                <div
                  key={a.id}
                  className="bg-muted/50 flex flex-col gap-0.5 rounded-xl px-4 py-3"
                >
                  <p className="text-sm font-semibold">{a.user.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {a.user.email}
                  </p>
                  {questionCount != null && questionCount > 0 && (
                    <Badge
                      variant={
                        a._count.responses >= questionCount
                          ? "default"
                          : "outline"
                      }
                      className="w-fit text-xs"
                    >
                      {a._count.responses >= questionCount
                        ? "Answered"
                        : "Partial"}
                    </Badge>
                  )}
                  {collectPhone && a.phone && (
                    <p className="text-muted-foreground text-xs">{a.phone}</p>
                  )}
                  {collectNotes && a.notes && (
                    <p className="text-foreground/70 mt-1 text-xs italic">
                      {a.notes}
                    </p>
                  )}
                  {showDays && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      <p className="text-muted-foreground text-xs font-medium">
                        Attending days:
                      </p>
                      {selectedDays.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {selectedDays.sort().map((day) => (
                            <span
                              key={day}
                              className="bg-primary/10 text-primary rounded-md px-2 py-0.5 text-xs font-medium"
                            >
                              {formatDayShort(day)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-xs italic">
                          Full camp
                        </p>
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
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
