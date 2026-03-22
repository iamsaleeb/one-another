import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getEvents, getSeries, searchEventsAndChurches } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";

const CADENCE_LABELS: Record<string, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
  CUSTOM: "Custom",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [searchResults, allEvents, allSeries] = await Promise.all([
    query ? searchEventsAndChurches(query) : null,
    query ? null : getEvents(),
    query ? null : getSeries(),
  ]);

  const filteredEvents = searchResults?.events ?? null;
  const filteredChurches = searchResults?.churches ?? null;
  const hasResults = (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title={query ? "Results" : "Home"}
        description={query ? `Showing results for "${q}"` : undefined}
      />

      <div className="flex flex-col gap-6 px-4 py-2">
        {query ? (
          /* ── Search results ── */
          !hasResults ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <SearchX className="size-10 text-muted-foreground/40" />
              <p className="text-base font-semibold">No results found</p>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
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
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                            {church.denomination}
                          </span>
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
            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Upcoming Events</h2>
              {allEvents?.map((item) => (
                <EventCard key={item.id} event={{ ...item, badge: item.tag, seriesName: item.series?.name }} />
              ))}
            </section>

            {allSeries && allSeries.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-base font-semibold">Series</h2>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
                  {allSeries.map((s) => (
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
            )}
          </>
        )}
      </div>
    </div>
  );
}
