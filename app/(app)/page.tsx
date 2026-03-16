import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { EventCard } from "@/components/event-card";
import { getEvents, searchEventsAndChurches } from "@/lib/actions/data";

const CATEGORIES = [
  { label: "Worship", emoji: "🎵" },
  { label: "Prayer", emoji: "🙏" },
  { label: "Youth", emoji: "⚡" },
  { label: "Outreach", emoji: "🤝" },
  { label: "Bible Study", emoji: "📖" },
  { label: "Missions", emoji: "🌍" },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [searchResults, allEvents] = await Promise.all([
    query ? searchEventsAndChurches(query) : null,
    query ? null : getEvents(),
  ]);

  const filteredEvents = searchResults?.events ?? null;
  const filteredChurches = searchResults?.churches ?? null;
  const hasResults = (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-5 pb-4">
        {query ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Results</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Showing results for &ldquo;{q}&rdquo;
            </p>
          </>
        ) : (
          <h1 className="text-2xl font-bold tracking-tight">Home</h1>
        )}
      </header>

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
                    <EventCard key={event.id} event={event} />
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
                      <Card className="rounded-2xl border-0 bg-white py-0 shadow-[4px_4px_10px_0px_#E8E8E866]">
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
                <EventCard key={item.id} event={item} />
              ))}
            </section>

            <section className="flex flex-col gap-3">
              <h2 className="text-base font-semibold">Browse by Category</h2>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => (
                  <Card
                    key={cat.label}
                    className="rounded-2xl border-0 bg-muted/40 shadow-sm cursor-pointer"
                  >
                    <CardContent className="flex flex-col items-center justify-center gap-1.5 p-4">
                      <span className="text-2xl">{cat.emoji}</span>
                      <p className="text-xs font-medium text-center">{cat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
