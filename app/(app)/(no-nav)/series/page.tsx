import Link from "next/link";
import { getSeries } from "@/domains/series/actions/data";
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
          <p className="text-muted-foreground py-8 text-center text-sm">
            No series yet
          </p>
        ) : (
          allSeries.map((s) => (
            <Link key={s.id} href={`/series/${s.id}`}>
              <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                      {CADENCE_LABELS[s.cadence] ?? s.cadence}
                    </span>
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
