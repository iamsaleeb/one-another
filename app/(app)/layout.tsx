import { auth } from "@/auth";
import { BottomNav } from "@/components/bottom-nav";
import { TopNav } from "@/components/top-nav";
import { CreateEventFAB } from "@/components/create-event-fab";
import { PushNotificationProvider } from "@/components/push-notification-provider";
import { BackButtonProvider } from "@/components/back-button-provider";
import { UserRole } from "@prisma/client";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const isOrganiser = session?.user?.role === UserRole.ORGANISER;
  const isAdmin = session?.user?.role === UserRole.ADMIN;

  return (
    <div className="min-h-screen">
      <TopNav user={session?.user} />
      <main className="pb-nav">{children}</main>
      <BottomNav isOrganiser={isOrganiser} isAdmin={isAdmin} />
      <CreateEventFAB isOrganiser={isOrganiser || isAdmin} />
      <PushNotificationProvider />
      <BackButtonProvider />
    </div>
  );
}
