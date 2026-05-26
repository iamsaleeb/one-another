import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { EventCard } from "@/domains/events/components/event-card";
import { searchEventsAndChurches } from "@/domains/profile/actions/data";
import {
  getFollowedChurchEventsPaged,
  getOtherChurchEventsPaged,
} from "@/domains/events/actions/data";
import {
  loadMoreFollowedEventsAction,
  loadMoreOtherEventsAction,
} from "@/domains/events/actions/pagination";
import { PageHeader } from "@/components/ui/page-header";
import { WHEN_LABELS, TYPE_LABELS, type WhenFilter } from "@/lib/types/search";
import { searchParamsSchema } from "@/lib/validations/search";
import { HomeEventTabs } from "@/domains/events/components/home-event-tabs";
import { auth } from "@/auth";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    type?: string;
    when?: string;
    category?: string;
  }>;
}) {
  const { q, type, when, category } = searchParamsSchema
    .catch({ q: undefined, type: "all", when: undefined, category: undefined })
    .parse(await searchParams);
  const query = q?.trim() ?? "";
  const hasFilters = !!(query || type !== "all" || when || category);

  const userId = hasFilters ? null : ((await auth())?.user?.id ?? null);

  const [searchResults, followedPage, otherPage] = await Promise.all([
    hasFilters
      ? searchEventsAndChurches({
          query,
          type,
          when: when as WhenFilter | undefined,
          category: category ?? "",
        })
      : Promise.resolve(null),
    !hasFilters && userId
      ? getFollowedChurchEventsPaged(userId, null)
      : Promise.resolve({ items: [], nextCursor: null }),
    !hasFilters
      ? getOtherChurchEventsPaged(userId, null)
      : Promise.resolve({ items: [], nextCursor: null }),
  ]);

  const filteredEvents = searchResults?.events ?? null;
  const filteredChurches = searchResults?.churches ?? null;

  const hasResults =
    (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

  const filterParts = [
    query ? `"${query}"` : null,
    category || null,
    when ? WHEN_LABELS[when as WhenFilter] : null,
    type && type !== "all" ? TYPE_LABELS[type] : null,
  ].filter(Boolean);

  const defaultTab = followedPage.items.length > 0 ? "followed" : "other";

  return (
    <div className="flex flex-col">
      <PageHeader
        title={hasFilters ? "Results" : "Home"}
        description={
          filterParts.length ? `Showing: ${filterParts.join(" · ")}` : undefined
        }
      />

      <div className="flex flex-col gap-6 px-4 py-2">
        {hasFilters ? (
          !hasResults ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <SearchX className="text-muted-foreground/40 size-10" />
              <p className="text-base font-semibold">No results found</p>
              <p className="text-muted-foreground text-sm">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              {filteredEvents && filteredEvents.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Events{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      ({filteredEvents.length})
                    </span>
                  </h2>
                  {filteredEvents.map((event, index) => (
                    <EventCard
                      key={event.id}
                      priority={index === 0}
                      event={{
                        ...event,
                        badge: event.tag,
                        churchName: event.church?.name ?? "",
                      }}
                    />
                  ))}
                </section>
              )}

              {filteredChurches && filteredChurches.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h2 className="text-base font-semibold">
                    Churches{" "}
                    <span className="text-muted-foreground text-sm font-normal">
                      ({filteredChurches.length})
                    </span>
                  </h2>
                  {filteredChurches.map((church) => (
                    <Link key={church.id} href={`/churches/${church.id}`}>
                      <Card className="shadow-card rounded-2xl border-0 bg-white py-0">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex flex-col gap-1">
                            <p className="text-sm font-bold">{church.name}</p>
                            <p className="text-muted-foreground flex items-center gap-1 text-xs">
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
          <HomeEventTabs
            defaultTab={defaultTab}
            followedPage={followedPage}
            otherPage={otherPage}
            isAuthenticated={!!userId}
            loadMoreFollowed={loadMoreFollowedEventsAction}
            loadMoreOther={loadMoreOtherEventsAction}
          />
        )}
      </div>
    </div>
  );
}
