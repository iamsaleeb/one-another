import type { Metadata } from "next";
import { getNotificationPreferencesAction } from "@/lib/actions/notifications";
import { NotificationSettings } from "@/components/notification-settings";
import { PageHeader } from "@/components/ui/page-header";

export const metadata: Metadata = {
  title: "Notifications — One Another",
};

export default async function NotificationsPage() {
  const preferences = await getNotificationPreferencesAction();

  return (
    <div className="bg-background min-h-screen">
      <PageHeader title="Notifications" />
      <div className="px-4 pb-8">
        <p className="text-sm text-muted-foreground mb-4">
          Choose which notifications you receive.
        </p>
        <NotificationSettings preferences={preferences} />
      </div>
    </div>
  );
}
