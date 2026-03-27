import { notFound } from "next/navigation";
import Link from "next/link";
import { MapPin, Pencil, Plus, Tag, User } from "lucide-react";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getSeriesById } from "@/lib/actions/data";
import { isOrganiserForChurch } from "@/lib/permissions";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";
import { EventCard } from "@/components/event-card";
import { Button } from "@/components/ui/button";
import { DeleteSeriesButton } from "./_components/delete-series-button";
import { FollowSeriesButton } from "./_components/follow-series-button";
import { CADENCE_LABELS } from "@/types/search";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const series = await getSeriesById(id);
  return { title: series ? `${series.name} — One Another` : "Series Not Found" };
}

export default async function SeriesDetailPage({ params }: Props) {
  const { id } = await params;
  const [series, session] = await Promise.all([getSeriesById(id), auth()]);

  if (!series) notFound();

  const isOrganiser =
    session?.user?.role === UserRole.ORGANISER &&
    !!(await isOrganiserForChurch(session?.user?.id, series.churchId));

  const userId = session?.user?.id;
  const isFollowing = userId ? series.followers.some((f) => f.userId === userId) : false;

  return (
    <div className="bg-background">
      <HeroBanner size="sm" />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{series.name}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                {CADENCE_LABELS[series.cadence] ?? series.cadence}
              </span>
              {isOrganiser && (
                <>
                  <Button asChild variant="outline" size="icon" className="size-9">
                    <Link href={`/series/${series.id}/edit`}>
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                  <DeleteSeriesButton seriesId={series.id} />
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <InfoField icon={MapPin} label="Location">{series.location}</InfoField>
            <InfoField icon={User} label="Host">{series.host}</InfoField>
            <InfoField icon={Tag} label="Category">{series.tag}</InfoField>
          </div>
        </div>

        {/* Description card */}
        <div className="rounded-2xl bg-white shadow-card p-5">
          <p className="text-sm text-foreground leading-relaxed">{series.description}</p>
        </div>

        {/* Upcoming sessions */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Sessions</h2>
            {isOrganiser && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/events/create?seriesId=${series.id}`}>
                  <Plus className="size-3.5" />
                  Add Session
                </Link>
              </Button>
            )}
          </div>
          {series.events.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming sessions</p>
          ) : (
            series.events.map((event) => (
              <EventCard key={event.id} event={{ ...event, badge: event.tag, seriesName: null }} />
            ))
          )}
        </section>
      </div>

      {session?.user && (
        <FollowSeriesButton
          seriesId={series.id}
          isFollowing={isFollowing}
          followerCount={series._count.followers}
        />
      )}
    </div>
  );
}
