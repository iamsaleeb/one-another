import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function CreateSeriesLoading() {
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Create Series" />
      <div className="px-4 pb-6">
        <Card className="gap-4 p-5">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </Card>
      </div>
    </div>
  );
}
