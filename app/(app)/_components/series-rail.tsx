import Link from "next/link";
import type { getSeries } from "@/lib/actions/data-series";
import { CADENCE_LABELS } from "@/types/search";

type Series = Awaited<ReturnType<typeof getSeries>>[number];

export function SeriesRail({ series }: { series: Series[] }) {
  if (series.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Series</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {series.map((s) => (
          <Link
            key={s.id}
            href={`/series/${s.id}`}
            className="flex items-center gap-1.5 shrink-0 rounded-full bg-white shadow-card px-3 py-2 text-sm font-medium"
          >
            {s.name}
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {CADENCE_LABELS[s.cadence] ?? s.cadence}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
