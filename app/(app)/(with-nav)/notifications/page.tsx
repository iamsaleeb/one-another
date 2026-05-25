import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { getInboxNotifications } from "@/domains/notifications/inbox";
import { NotificationList } from "./_components/notification-list";

export const metadata: Metadata = {
  title: "Notifications — One Another",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const PAGE_SIZE = 20;
  const notifications = await getInboxNotifications({
    userId: session.user.id,
    page: 1,
    pageSize: PAGE_SIZE,
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Notifications" />
      <NotificationList
        initialNotifications={notifications}
        hasMore={notifications.length === PAGE_SIZE}
      />
    </div>
  );
}
