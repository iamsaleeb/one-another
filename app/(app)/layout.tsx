import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { UserRole } from "@prisma/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;

  return (
    <div className="min-h-screen">
      <TopNav user={session?.user} />
      <main className="pb-nav">{children}</main>
      <BottomNav isOrganiser={isOrganiser} />
      <CreateEventFAB isOrganiser={isOrganiser} />
    </div>
  );
}
