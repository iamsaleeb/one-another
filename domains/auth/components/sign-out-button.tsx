"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { takeDeviceToken } from "@/domains/notifications/lib/device-token";
import { signOutAction } from "../actions/auth";

// Signs out and withdraws this device's push token, so a shared device stops
// getting the signed-out user's notifications.
export function SignOutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <Item size="sm" className="w-full rounded-none" asChild>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            await signOutAction(takeDeviceToken());
          })
        }
      >
        <ItemMedia>
          {isPending ? (
            <Spinner className="text-primary size-3.5" />
          ) : (
            <LogOut className="text-primary size-3.5" />
          )}
        </ItemMedia>
        <ItemContent>
          <ItemTitle>Sign out</ItemTitle>
        </ItemContent>
      </button>
    </Item>
  );
}
