import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <Skeleton className="mt-0.5 shrink-0 size-7 rounded-full" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

export default function NotificationsLoading() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Notifications" />
      <div className="px-4">
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
          <NotificationRowSkeleton />
        </div>
      </div>
    </div>
  );
}
