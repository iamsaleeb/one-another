"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { FCM } from "@capacitor-community/fcm";
import { toast } from "sonner";

export function PushNotificationProvider() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const handles: PluginListenerHandle[] = [];

    async function init() {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === "prompt") {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== "granted") return;

      handles.push(
        await PushNotifications.addListener("registration", async (nativeToken) => {
          const platform = Capacitor.getPlatform();
          try {
            // On Android the registration event carries the FCM token directly.
            // On iOS it carries an APNs device token — FCM.getToken() exchanges
            // it for the actual FCM registration token the server needs.
            const fcmToken =
              platform === "ios"
                ? (await FCM.getToken()).token
                : nativeToken.value;

            const res = await fetch("/api/push/register-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: fcmToken, platform }),
            });
            if (!res.ok) {
              const body = await res.text().catch(() => "(unreadable)");
              console.error(`Failed to register push token: ${res.status} ${res.statusText} — ${body}`);
            }
          } catch (err) {
            console.error("Failed to register push token:", err);
          }
        })
      );

      handles.push(
        await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err.error);
        })
      );

      handles.push(
        await PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            // Show an in-app toast when a notification arrives while the app
            // is in the foreground (iOS suppresses system banners in this case)
            toast(notification.title ?? "Notification", {
              description: notification.body,
            });
          }
        )
      );

      handles.push(
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (notification) => {
            const data = notification.notification.data;
            if (data?.eventId) {
              router.push(`/events/${data.eventId}`);
            } else if (data?.seriesId) {
              router.push(`/series/${data.seriesId}`);
            }
          }
        )
      );

      await PushNotifications.register();
    }

    init();

    return () => {
      handles.forEach((h) => h.remove());
    };
  }, [router]);

  return null;
}
