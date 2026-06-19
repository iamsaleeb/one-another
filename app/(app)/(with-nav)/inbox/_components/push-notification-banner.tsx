"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { BellOff, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type BannerState = "hidden" | "prompt" | "denied";

export function PushNotificationBanner() {
  const [state, setState] = useState<BannerState>("hidden");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function check() {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === "prompt" || status.receive === "denied") {
        setState(status.receive);
      } else {
        setState("hidden");
      }
    }

    check();

    // Re-check when app resumes (user may have toggled in device settings)
    const onResume = () => check();
    document.addEventListener("resume", onResume);
    return () => document.removeEventListener("resume", onResume);
  }, []);

  const handleEnable = useCallback(async () => {
    if (state === "prompt") {
      const result = await PushNotifications.requestPermissions();
      if (result.receive === "granted") {
        await PushNotifications.register();
        setState("hidden");
      } else if (result.receive === "denied") {
        setState("denied");
      }
    } else if (state === "denied") {
      // Once denied at OS level, re-request on Android 13+ may re-prompt.
      // If it stays denied, the user must manually enable in device settings.
      const result = await PushNotifications.requestPermissions();
      if (result.receive === "granted") {
        await PushNotifications.register();
        setState("hidden");
      }
    }
  }, [state]);

  if (state === "hidden" || dismissed) return null;

  return (
    <div className="px-4 pt-2">
      <Alert className="relative border-amber-200 bg-amber-50">
        <BellOff className="size-4 text-amber-600" />
        <AlertTitle className="text-amber-900">
          Notifications are off
        </AlertTitle>
        <AlertDescription className="text-amber-700">
          {state === "prompt"
            ? "Enable push notifications so you never miss an event update."
            : "Push notifications are disabled. If prompted, allow notifications to stay up to date."}
          <Button
            size="sm"
            variant="outline"
            className="mt-2 border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
            onClick={handleEnable}
          >
            Enable notifications
          </Button>
        </AlertDescription>
        <button
          className="absolute top-2 right-2 rounded-sm p-0.5 text-amber-400 hover:text-amber-600"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </Alert>
    </div>
  );
}
