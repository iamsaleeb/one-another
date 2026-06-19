import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { getInboxNotifications } from "@/domains/notifications/inbox";
import { InboxTabs } from "./_components/inbox-tabs";

export const metadata: Metadata = {
  title: "Inbox — One Another",
};

export default async function InboxPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const PAGE_SIZE = 20;
  const notifications = await getInboxNotifications({
    userId: session.user.id,
    page: 1,
    pageSize: PAGE_SIZE + 1,
  });

  return (
    <div className="flex flex-col">
      <PageHeader title="Inbox" />
      <InboxTabs
        initialNotifications={notifications.slice(0, PAGE_SIZE)}
        hasMore={notifications.length > PAGE_SIZE}
      />
    </div>
  );
}
