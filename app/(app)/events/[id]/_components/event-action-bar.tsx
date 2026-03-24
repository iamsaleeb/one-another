"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AttendButton } from "./attend-button";
import { RegistrationDrawer } from "./registration-drawer";

interface EventActionBarProps {
  eventId: string;
  eventTitle: string;
  requiresRegistration: boolean;
  isAttending: boolean;
  userName: string;
  userEmail: string;
  capacity?: number | null;
  spotsUsed: number;
  collectPhone: boolean;
  collectNotes: boolean;
}

export function EventActionBar({
  eventId,
  eventTitle,
  requiresRegistration,
  isAttending,
  userName,
  userEmail,
  capacity,
  spotsUsed,
  collectPhone,
  collectNotes,
}: EventActionBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const spotsLeft = capacity != null ? capacity - spotsUsed : null;
  const isFull = spotsLeft != null && spotsLeft <= 0 && !isAttending;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-2px_31px_0px_#0000001A] pb-safe">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">Cost</p>
            <p className="text-base font-bold">Free Event</p>
            {spotsLeft != null && !isAttending && (
              <p className={`text-xs font-medium ${spotsLeft === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {spotsLeft === 0 ? "Fully booked" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
              </p>
            )}
          </div>

          {requiresRegistration ? (
            <Button
              onClick={() => setDrawerOpen(true)}
              variant={isAttending ? "outline" : "default"}
              className={isAttending ? "gap-1.5" : ""}
              disabled={isFull}
            >
              {isAttending && <Check className="size-4" />}
              {isAttending ? "Registered" : isFull ? "Fully booked" : "Register"}
            </Button>
          ) : (
            <AttendButton eventId={eventId} isAttending={isAttending} />
          )}
        </div>
      </div>

      {requiresRegistration && (
        <RegistrationDrawer
          eventId={eventId}
          eventTitle={eventTitle}
          isRegistered={isAttending}
          userName={userName}
          userEmail={userEmail}
          collectPhone={collectPhone}
          collectNotes={collectNotes}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
        />
      )}
    </>
  );
}
