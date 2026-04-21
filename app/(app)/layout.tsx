import { Suspense } from "react";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";
import { getCachedUnreadCount } from "@/lib/actions/data-user";
import { UserRole } from "@prisma/client";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Suspense>
        <AppShellNav />
      </Suspense>
      <main className="pb-nav">{children}</main>
      <Suspense>
        <BackButtonProvider />
      </Suspense>
    </div>
  );
}

async function AppShellNav() {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const unreadCount = session?.user?.id
    ? await getCachedUnreadCount(session.user.id)
    : 0;

  return (
    <>
      <TopNav user={session?.user} />
      <BottomNav isOrganiser={isOrganiser} isAdmin={isAdmin} unreadCount={unreadCount} />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
      <PushNotificationProvider />
    </>
  );
}
