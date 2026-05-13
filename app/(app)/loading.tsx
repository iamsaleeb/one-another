import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      <div className="flex flex-col gap-6 px-4 py-2">
        <section className="flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </section>
        <section className="flex flex-col gap-3">
          <Skeleton className="h-5 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-24 shrink-0 rounded-full" />
          </div>
        </section>
      </div>
    </div>
  );
}
