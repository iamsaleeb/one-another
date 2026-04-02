import { Skeleton } from "@/components/ui/skeleton";

export default function ChurchesLoading() {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-4 gap-3 px-4 py-2">
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
        <Skeleton className="aspect-[2/4] rounded-lg" />
      </div>
    </div>
  );
}
