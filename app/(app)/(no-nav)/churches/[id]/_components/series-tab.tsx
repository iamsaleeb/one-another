import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { getChurchById } from "@/domains/churches/actions/data";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface SeriesTabProps {
  series: ChurchWithDetails["series"];
}

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

export function SeriesTab({ series }: SeriesTabProps) {
  return (
    <div>
      <h2 className="mb-3 text-lg font-bold">Series</h2>

      {series.length === 0 ? (
        <EmptyState icon={Repeat} label="No series yet" className="py-10" />
      ) : (
        <div className="flex flex-col gap-3">
          {series.map((s) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
