import { Suspense } from "react";
import { auth } from "@/auth";
import { getAbility, hasAnyGrant } from "@/domains/roles";
import { BottomNav } from "@/components/bottom-nav";
import { CreateEventFAB } from "@/domains/events/components/create-event-fab";
import { getCachedUnreadCount } from "@/domains/notifications/actions/data";

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
    <nav className="pb-safe bg-card fixed right-0 bottom-0 left-0 z-50 shadow-[0px_-2px_31px_0px_#0000001A]">
      <div className="h-16" />
    </nav>
  );
}

async function NavShell() {
  const [session, ability] = await Promise.all([auth(), getAbility()]);
  const isAuthenticated = !!session?.user;
  // Subject-type checks ask "somewhere": true if any rule could allow it.
  const isOrganiser = hasAnyGrant(ability);
  const isAdmin = ability.can("manage_members", "Church");
  const canCreateSeries = ability.can("create", "Series");
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
      <CreateEventFAB
        isOrganiser={isOrganiser || isAdmin}
        canCreateSeries={canCreateSeries}
      />
    </>
  );
}
