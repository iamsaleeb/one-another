"use client";

import { useActionState, useTransition, useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { registerEventAction, unattendEventAction, type RegisterEventState } from "@/lib/actions/events-attendance";
import type { EventMetadata } from "@/lib/types/event-metadata";

interface RegistrationDrawerProps {
  eventId: string;
  eventTitle: string;
  isRegistered: boolean;
  userName: string;
  userEmail: string;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
}

/** Returns all ISO dates (YYYY-MM-DD) between startDate and endDate inclusive */
function getCampDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  const current = new Date(`${startDate}T12:00:00.000Z`);
  const end = new Date(`${endDate}T12:00:00.000Z`);
  while (current <= end) {
    days.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return days;
}

function formatDayLabel(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" });
}

export function RegistrationDrawer({
  eventId,
  eventTitle,
  isRegistered,
  userName,
  userEmail,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
  camp,
  campStartDate,
}: RegistrationDrawerProps) {
  const boundAction = registerEventAction.bind(null, eventId);
  const [state, formAction, isPending] = useActionState<RegisterEventState, FormData>(
    boundAction,
    {}
  );
  const [unattendPending, startUnattendTransition] = useTransition();

  const showPartialDays =
    camp?.allowPartialRegistration === true &&
    !!campStartDate &&
    !!camp.endDate;

  const allDays =
    showPartialDays && campStartDate && camp?.endDate
      ? getCampDays(campStartDate, camp.endDate)
      : [];

  const [selectedDays, setSelectedDays] = useState<string[]>(allDays);

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function handleUnregister() {
    startUnattendTransition(async () => {
      await unattendEventAction(eventId);
      onOpenChange(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>{isRegistered ? "Your Registration" : `Register for ${eventTitle}`}</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-2 flex flex-col gap-4">
          {isRegistered ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You&apos;re registered for this event.
              </p>
            </div>
          ) : (
            <form action={formAction} className="flex flex-col gap-4">
              {state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input value={userName} disabled className="bg-muted" />
              </div>

              <div className="grid gap-1.5">
                <Label>Email</Label>
                <Input value={userEmail} disabled className="bg-muted" />
              </div>

              {showPartialDays && allDays.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label>Which days will you attend?</Label>
                  <div className="flex flex-col gap-2 rounded-xl border px-3 py-3">
                    {allDays.map((day) => (
                      <div key={day} className="flex items-center gap-2.5">
                        <Checkbox
                          id={`day-${day}`}
                          checked={selectedDays.includes(day)}
                          onCheckedChange={() => toggleDay(day)}
                          disabled={isPending}
                        />
                        <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer">
                          {formatDayLabel(day)}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {/* Pass selected days as JSON to the server action */}
                  <input
                    type="hidden"
                    name="selectedDays"
                    value={JSON.stringify(selectedDays)}
                  />
                </div>
              )}

              {collectPhone && (
                <div className="grid gap-1.5">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input id="phone" name="phone" type="tel" placeholder="+44 7700 000000" disabled={isPending} />
                </div>
              )}

              {collectNotes && (
                <div className="grid gap-1.5">
                  <Label htmlFor="notes">Dietary / accessibility needs</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    placeholder="Let us know if you have any requirements..."
                    disabled={isPending}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isPending || (showPartialDays ? selectedDays.length === 0 : false)}
              >
                {isPending ? "Registering..." : "Confirm Registration"}
              </Button>
              {showPartialDays && selectedDays.length === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Please select at least one day to attend.
                </p>
              )}
            </form>
          )}
        </div>

        <DrawerFooter>
          {isRegistered ? (
            <Button
              variant="destructive"
              onClick={handleUnregister}
              disabled={unattendPending}
              className="w-full"
            >
              {unattendPending ? "Cancelling..." : "Cancel Registration"}
            </Button>
          ) : null}
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
