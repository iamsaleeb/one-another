import { Suspense } from "react";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <TopNavServer />
      </Suspense>
      {children}
      <PushNotificationProvider />
      <Suspense>
        <BackButtonProvider />
      </Suspense>
    </div>
  );
}

async function TopNavServer() {
  const session = await auth();
  return <TopNav user={session?.user} />;
}
