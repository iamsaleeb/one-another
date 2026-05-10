import { Suspense } from "react";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  return (
    <div className="min-h-screen">
      <TopNav user={session?.user} />
      {children}
      <PushNotificationProvider />
      <Suspense>
        <BackButtonProvider />
      </Suspense>
    </div>
  );
}
