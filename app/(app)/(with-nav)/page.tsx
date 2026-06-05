import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, SearchX } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  WHEN_LABELS,
  TYPE_LABELS,
  type WhenFilter,
  type TypeFilter,
} from "@/lib/types/search";
import { searchParamsSchema } from "@/lib/validations/search";
import { HomeEventTabs } from "@/domains/events/components/home-event-tabs";
import { auth } from "@/auth";

interface HomeContentProps {
  query: string;
  type: TypeFilter;
  when: string | undefined;
  category: string | undefined;
  hasFilters: boolean;
}

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
        description={
          filterParts.length ? `Showing: ${filterParts.join(" · ")}` : undefined
        }
      />
      <div className="flex flex-col gap-6 px-4 py-2">
        <Suspense fallback={<HomeContentSkeleton />}>
          <HomeContent
            query={query}
            type={type}
            when={when}
            category={category}
            hasFilters={hasFilters}
          />
        </Suspense>
      </div>
    </div>
  );
}

function HomeContentSkeleton() {
  return (
    <section className="flex flex-col gap-3">
      <Skeleton className="h-5 w-36" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-24 w-full rounded-2xl" />
    </section>
  );
}

async function HomeContent({
  query,
  type,
  when,
  category,
  hasFilters,
}: HomeContentProps) {
  if (hasFilters) {
    const results = await searchEventsAndChurches({
      query,
      type,
      when: when as WhenFilter | undefined,
      category: category ?? "",
    });

    const filteredEvents = results?.events ?? null;
    const filteredChurches = results?.churches ?? null;
    const hasResults =
      (filteredEvents?.length ?? 0) > 0 || (filteredChurches?.length ?? 0) > 0;

    if (!hasResults) {
      return (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <SearchX className="text-muted-foreground/40 size-10" />
          <p className="text-base font-semibold">No results found</p>
          <p className="text-muted-foreground text-sm">
            Try adjusting your filters
          </p>
        </div>
      );
    }

    return (
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
    );
  }

  const userId = (await auth())?.user?.id ?? null;
  const [followedPage, otherPage] = await Promise.all([
    userId
      ? getFollowedChurchEventsPaged(userId, null)
      : Promise.resolve({ items: [], nextCursor: null }),
    getOtherChurchEventsPaged(userId, null),
  ]);
  const defaultTab = followedPage.items.length > 0 ? "followed" : "other";

  return (
    <HomeEventTabs
      defaultTab={defaultTab}
      followedPage={followedPage}
      otherPage={otherPage}
      isAuthenticated={!!userId}
      loadMoreFollowed={loadMoreFollowedEventsAction}
      loadMoreOther={loadMoreOtherEventsAction}
    />
  );
}
