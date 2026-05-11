import Link from "next/link";
import { getSeries } from "@/lib/actions/data-series";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CADENCE_LABELS } from "@/types/search";

export default async function SeriesPage() {
  const allSeries = await getSeries();

  return (
    <div className="flex flex-col">
      <PageHeader title="Series" description="Recurring events" />

      <div className="flex flex-col gap-3 px-4 py-2">
        {allSeries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No series yet</p>
        ) : (
          allSeries.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="rounded-2xl border-0 bg-white py-0 shadow-card">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                      {CADENCE_LABELS[s.cadence] ?? s.cadence}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s._count.events} upcoming
                    </span>
                  </div>
                  <p className="text-base font-bold leading-snug">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.tag}</p>
                  <p className="text-sm text-muted-foreground">{s.location}</p>
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
