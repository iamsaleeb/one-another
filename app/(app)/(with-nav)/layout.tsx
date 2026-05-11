import { Suspense } from "react";
import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { getCachedUnreadCount } from "@/lib/actions/data-user";
import { UserRole } from "@prisma/client";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <Suspense>
        <NavShell />
      </Suspense>
      <main className="pb-nav">{children}</main>
    </div>
  );
}

async function NavShell() {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;
  const unreadCount = session?.user?.id
    ? await getCachedUnreadCount(session.user.id)
    : 0;

  return (
    <>
      <BottomNav isOrganiser={isOrganiser} isAdmin={isAdmin} unreadCount={unreadCount} />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
    </>
  );
}
