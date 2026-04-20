import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import type { getChurchById } from "@/lib/actions/data-churches";

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
      <h2 className="text-lg font-bold mb-3">Series</h2>

      {series.length === 0 ? (
        <EmptyState icon={Repeat} label="No series yet" className="py-10" />
      ) : (
        <div className="space-y-3">
          {series.map((s) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
