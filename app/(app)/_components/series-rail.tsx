import Link from "next/link";
import type { getSeries } from "@/lib/actions/data-series";
import { CADENCE_LABELS } from "@/types/search";

type Series = Awaited<ReturnType<typeof getSeries>>[number];

export function SeriesRail({ series }: { series: Series[] }) {
  if (series.length === 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-base font-semibold">Series</h2>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {series.map((s) => (
          <Link
            key={s.id}
            href={`/series/${s.id}`}
            className="shadow-card flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-medium"
          >
            {s.name}
            <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-xs font-medium">
              {CADENCE_LABELS[s.cadence] ?? s.cadence}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
