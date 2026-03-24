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
  price?: string | null;
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
  price,
}: EventActionBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const spotsLeft = capacity != null ? capacity - spotsUsed : null;
  const isFull = spotsLeft != null && spotsLeft <= 0 && !isAttending;

  const formattedPrice = price
    ? new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(parseFloat(price))
    : "Free";

  // Decide what to show in the info section
  const showCapacity = requiresRegistration && capacity != null;
  const infoLabel = showCapacity ? "Availability" : "Cost";
  const infoValue = showCapacity
    ? isFull
      ? "Fully booked"
      : `${spotsLeft} / ${capacity} spots`
    : formattedPrice;
  const infoValueColor = showCapacity && isFull ? "text-destructive" : "text-foreground";

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-10 bg-white shadow-[0px_-2px_31px_0px_#0000001A] pb-safe">
        <div className="flex items-center justify-between gap-4 px-4 py-4">
          <div className="flex flex-col gap-0.5">
            <p className="text-xs text-muted-foreground">{infoLabel}</p>
            <p className={`text-base font-bold ${infoValueColor}`}>{infoValue}</p>
            {showCapacity && price && (
              <p className="text-xs text-muted-foreground">{formattedPrice}</p>
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
