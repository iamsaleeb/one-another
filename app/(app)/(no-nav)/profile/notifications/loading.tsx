import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function ToggleRowSkeleton() {
  return (
    <div className="shadow-card flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="mt-0.5 h-6 w-10 shrink-0 rounded-full" />
    </div>
  );
}

export default function ProfileNotificationsLoading() {
  return (
    <div className="bg-background">
      <PageHeader title="Notifications" />
      <div className="space-y-3 px-4 pb-8">
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
      </div>
    </div>
  );
}
