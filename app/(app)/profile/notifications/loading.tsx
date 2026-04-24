import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function ToggleRowSkeleton() {
  return (
    <div className="rounded-2xl bg-white shadow-card px-4 py-3 flex items-start justify-between gap-3">
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="mt-0.5 shrink-0 h-6 w-10 rounded-full" />
    </div>
  );
}

export default function ProfileNotificationsLoading() {
  return (
    <div className="bg-background">
      <PageHeader title="Notifications" />
      <div className="px-4 pb-8 space-y-3">
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
      </div>
    </div>
  );
}
