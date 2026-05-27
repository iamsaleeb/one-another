import { Suspense } from "react";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { CreateEventFAB } from "@/domains/events/components/create-event-fab";
import { getCachedUnreadCount } from "@/domains/notifications/actions/data";
import { UserRole } from "@prisma/client";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense fallback={<NavShellFallback />}>
        <NavShell />
      </Suspense>
      <main className="pb-nav">{children}</main>
    </div>
  );
}

function NavShellFallback() {
  return (
    <nav className="pb-safe fixed right-0 bottom-0 left-0 z-50 bg-white shadow-[0px_-2px_31px_0px_#0000001A]">
      <div className="h-16" />
    </nav>
  );
}

async function NavShell() {
  const session = await auth();
  const isAuthenticated = !!session?.user;
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const unreadCount = session?.user?.id
    ? await getCachedUnreadCount(session.user.id)
    : 0;

  return (
    <>
      <BottomNav
        isAuthenticated={isAuthenticated}
        isOrganiser={isOrganiser}
        isAdmin={isAdmin}
        unreadCount={unreadCount}
      />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
    </>
  );
}
