import { Suspense } from "react";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {children}
      <PushNotificationProvider />
      <Suspense>
        <BackButtonProvider />
      </Suspense>
    </div>
  );
}
