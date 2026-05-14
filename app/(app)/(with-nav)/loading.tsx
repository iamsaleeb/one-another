import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomeLoading() {
  return (
    <div className="flex flex-col">
      <PageHeader title="Home" />
      <div className="flex flex-col gap-6 px-4 py-2">
        <section className="flex flex-col gap-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </section>
      </div>
    </div>
  );
}
