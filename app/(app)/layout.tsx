import { Suspense } from "react";
import { auth } from "@/auth";
import { TopNav } from "@/components/top-nav";
import { PushNotificationProvider } from "@/domains/notifications/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";
import { SessionProvider } from "@/components/session-provider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="min-h-screen">
        <Suspense fallback={<TopNavFallback />}>
          <TopNavServer />
        </Suspense>
        {children}
        <PushNotificationProvider />
        <Suspense>
          <BackButtonProvider />
        </Suspense>
      </div>
    </SessionProvider>
  );
}

function TopNavFallback() {
  return (
    <header className="bg-primary pt-safe sticky top-0 z-50">
      <div className="h-14" />
      <div className="border-border border-b bg-white px-4 py-2.5">
        <div className="bg-muted/60 h-10 w-full rounded-full" />
      </div>
    </header>
  );
}

async function TopNavServer() {
  const session = await auth();
  return <TopNav user={session?.user} />;
}
