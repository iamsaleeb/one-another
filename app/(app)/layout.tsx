import { Suspense } from "react";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";
import { UserRole } from "@prisma/client";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <AppShell>{children}</AppShell>
      </Suspense>
      <Suspense>
        <BackButtonProvider />
      </Suspense>
    </div>
  );
}

async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;

  return (
    <>
      <TopNav user={session?.user} />
      <main className="pb-nav">{children}</main>
      <BottomNav isOrganiser={isOrganiser} isAdmin={isAdmin} />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
      <PushNotificationProvider />
    </>
  );
}
