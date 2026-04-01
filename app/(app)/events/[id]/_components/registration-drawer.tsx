"use client";

import { useActionState, useTransition, useEffect } from "react";
import { Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { registerEventAction, unattendEventAction, type RegisterEventState } from "@/lib/actions/events";

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
}: RegistrationDrawerProps) {
  const boundAction = registerEventAction.bind(null, eventId);
  const [state, formAction, isPending] = useActionState<RegisterEventState, FormData>(
    boundAction,
    {}
  );
  const [unattendPending, startUnattendTransition] = useTransition();

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

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

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Registering..." : "Confirm Registration"}
              </Button>
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
