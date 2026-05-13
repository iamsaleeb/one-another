import { Skeleton } from "@/components/ui/skeleton";

function RowSkeleton() {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  );
}

export default function ProfileLoading() {
  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        <div className="shadow-card flex items-center gap-4 rounded-2xl bg-white p-5">
          <Skeleton className="size-16 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-44" />
          </div>
        </div>
        <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
          <div className="px-4 py-3">
            <Skeleton className="h-4 w-16" />
          </div>
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
        <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
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
