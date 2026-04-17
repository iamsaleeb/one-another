import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { getUserFollowedSeries } from "@/lib/actions/data-series";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

interface MySeriesTabProps {
  series: Awaited<ReturnType<typeof getUserFollowedSeries>>;
}

export function MySeriesTab({ series }: MySeriesTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {series.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10">
          <Repeat className="w-8 h-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No followed series yet</p>
        </div>
      ) : (
        series.map((s) => (
          <Link key={s.id} href={`/series/${s.id}`}>
            <Card className="rounded-2xl border-0 bg-white py-0 shadow-card">
              <CardContent className="flex flex-col gap-1.5 p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                    {CADENCE_LABELS[s.cadence] ?? s.cadence}
                  </span>
                  <span className="text-xs text-muted-foreground">{s._count.events} upcoming</span>
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
  );
}
