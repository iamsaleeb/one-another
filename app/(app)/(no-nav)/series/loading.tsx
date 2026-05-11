import { Skeleton } from "@/components/ui/skeleton";

export default function SeriesLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-3 px-4 py-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
