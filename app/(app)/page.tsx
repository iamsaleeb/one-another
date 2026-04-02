import Link from "next/link";
import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EventCard } from "@/components/event-card";
import { searchEventsAndChurches } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { WHEN_LABELS, TYPE_LABELS, type WhenFilter, type TypeFilter } from "@/types/search";
import { EventList } from "./_components/event-list";
import { SeriesRail } from "./_components/series-rail";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; when?: string; category?: string }>;
}) {
  const { q, type, when, category } = await searchParams;
  const query = q?.trim() ?? "";
  const hasFilters = !!(query || type || when || category);

  const searchResults = hasFilters
    ? await searchEventsAndChurches({
        query,
        type: (type as TypeFilter) ?? "all",
        when: when as WhenFilter | undefined,
        category: category ?? "",
      })
    : null;

  const filteredEvents = searchResults?.events ?? null;
  const filteredChurches = searchResults?.churches ?? null;
  const hasResults = (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

  const filterParts = [
    query ? `"${query}"` : null,
    category || null,
    when ? WHEN_LABELS[when as WhenFilter] : null,
    type && type !== "all" ? TYPE_LABELS[type] : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col">
      <PageHeader
        title={hasFilters ? "Results" : "Home"}
        description={filterParts.length ? `Showing: ${filterParts.join(" · ")}` : undefined}
      />

      <div className="flex flex-col gap-6 px-4 py-2">
        {hasFilters ? (
          /* ── Search results ── */
          !hasResults ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <SearchX className="size-10 text-muted-foreground/40" />
              <p className="text-base font-semibold">No results found</p>
              <p className="text-sm text-muted-foreground">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {filteredEvents && filteredEvents.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Events{" "}
                    <span className="text-sm font-normal text-muted-foreground">({filteredEvents.length})</span>
                  </h2>
                  {filteredEvents.map((event) => (
                    <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: event.series?.name }} />
                  ))}
                </section>
              )}

              {filteredChurches && filteredChurches.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Churches{" "}
                    <span className="text-sm font-normal text-muted-foreground">({filteredChurches.length})</span>
                  </h2>
                  {filteredChurches.map((church) => (
                    <Link key={church.id} href={`/churches/${church.id}`}>
                      <Card className="rounded-2xl border-0 bg-white py-0 shadow-card">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold">{church.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="size-3" />
                              {church.address}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </section>
              )}
            </>
          )
        ) : (
          /* ── Default home content ── */
          <>
            <Suspense
              fallback={
                <section className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-24 w-full rounded-2xl" />
                </section>
              }
            >
              <EventList />
            </Suspense>
            <Suspense
              fallback={
                <section className="flex flex-col gap-3">
                  <Skeleton className="h-5 w-20" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                    <Skeleton className="h-9 w-24 rounded-full shrink-0" />
                  </div>
                </section>
              }
            >
              <SeriesRail />
            </Suspense>
          </>
        )}
      </div>
    </div>
  );
}
