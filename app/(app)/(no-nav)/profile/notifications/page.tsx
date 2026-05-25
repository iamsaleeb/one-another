import type { Metadata } from "next";
import { getNotificationPreferencesAction } from "@/domains/notifications/actions/notifications";
import { NotificationSettings } from "@/domains/notifications/components/notification-settings";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Notifications — One Another",
};

export default async function NotificationsPage() {
  const preferences = await getNotificationPreferencesAction();

  return (
    <div className="bg-background">
      <PageHeader title="Notifications" />
      <div className="px-4 pb-8">
        <p className="text-muted-foreground mb-4 text-sm">
          Choose which notifications you receive.
        </p>
        <NotificationSettings preferences={preferences} />
      </div>
    </div>
  );
}
