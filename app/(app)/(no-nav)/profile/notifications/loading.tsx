import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function ToggleRowSkeleton() {
  return (
    <Card className="flex-row items-start justify-between gap-3 px-4 py-3">
      <div className="flex flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56" />
      </div>
      <Skeleton className="mt-0.5 h-6 w-10 shrink-0 rounded-full" />
    </Card>
  );
}

export default function ProfileNotificationsLoading() {
  return (
    <div className="bg-background">
      <PageHeader title="Notifications" />
      <div className="flex flex-col gap-3 px-4 pb-8">
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
        <ToggleRowSkeleton />
      </div>
    </div>
  );
}
