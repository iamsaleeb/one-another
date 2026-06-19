"use client";

import { useCallback, useEffect, useState } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { App } from "@capacitor/app";
import { PushNotifications } from "@capacitor/push-notifications";
import { BellOff, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type BannerState = "hidden" | "prompt" | "denied";

const DISMISS_KEY = "push-banner-dismissed";

export function PushNotificationBanner() {
  const [state, setState] = useState<BannerState>("hidden");
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let handle: PluginListenerHandle | undefined;

    async function check() {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === "prompt" || status.receive === "denied") {
        setState(status.receive);
      } else {
        setState("hidden");
      }
    }

    check();

    App.addListener("resume", () => check()).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove();
    };
  }, []);

  const handleEnable = useCallback(async () => {
    const result = await PushNotifications.requestPermissions();
    if (result.receive === "granted") {
      // Reload so PushNotificationProvider re-inits with full listener
      // setup and token registration — avoids duplicating that logic here.
      window.location.reload();
    } else if (result.receive === "denied") {
      setState("denied");
    }
  }, []);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }, []);

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
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </Alert>
    </div>
  );
}
