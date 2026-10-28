import Link from "next/link";
import { getSeries } from "@/domains/series/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { Empty, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CADENCE_LABELS } from "@/lib/types/search";

export default async function SeriesPage() {
  const allSeries = await getSeries();

  return (
    <div className="flex flex-col">
      <PageHeader title="Series" description="Recurring events" />

      <div className="flex flex-col gap-3 px-4 py-2">
        {allSeries.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No series yet</EmptyTitle>
            </EmptyHeader>
          </Empty>
        ) : (
          allSeries.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="soft">
                      {CADENCE_LABELS[s.cadence] ?? s.cadence}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base leading-snug font-bold">{s.name}</p>
                  <p className="text-muted-foreground text-sm">{s.tag}</p>
                  <p className="text-muted-foreground text-sm">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
