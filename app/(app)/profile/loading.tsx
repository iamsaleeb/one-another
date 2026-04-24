import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        <div className="rounded-2xl bg-white shadow-card p-5 flex items-center gap-4">
          <Skeleton className="size-16 rounded-xl shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </div>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-12" />
          </div>
          <RowSkeleton />
          <RowSkeleton />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
