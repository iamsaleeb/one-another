import { Skeleton } from "@/components/ui/skeleton";

export default function OrganiserLoading() {
  return (
    <div className="flex flex-col">
      <div className="px-4 py-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </div>
    </div>
  );
}
