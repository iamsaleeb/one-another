import { Skeleton } from "@/components/ui/skeleton";

export default function EventLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-20 w-full rounded-2xl" />
    </div>
  );
}
