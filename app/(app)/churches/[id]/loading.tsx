import { Skeleton } from "@/components/ui/skeleton";

export default function ChurchLoading() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-5 pb-8">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-6 w-1/2 mx-auto" />
      <Skeleton className="h-10 w-32 mx-auto rounded-full" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}
