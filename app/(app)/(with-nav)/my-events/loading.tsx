import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function MyEventsLoading() {
  return (
    <div className="flex flex-col">
      <PageHeader title="My Events" />
      <div className="flex flex-col gap-3 px-4 py-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
