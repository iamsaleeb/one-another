import Link from "next/link";
import { Repeat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { getUserFollowedSeries } from "@/domains/series/actions/data";
import { CADENCE_LABELS } from "@/lib/types/search";

interface MySeriesTabProps {
  series: Awaited<ReturnType<typeof getUserFollowedSeries>>;
}

export function MySeriesTab({ series }: MySeriesTabProps) {
  return (
    <div className="flex flex-col gap-3">
      {series.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Repeat />
            </EmptyMedia>
            <EmptyTitle>No followed series yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        series.map((s) => (
          <Link key={s.id} href={`/series/${s.id}`}>
            <Card className="rounded-2xl border-0 bg-white py-0">
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
  );
}
