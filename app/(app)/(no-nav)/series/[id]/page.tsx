import { notFound } from "next/navigation";
import Link from "next/link";
import { Church, MapPin, Pencil, Plus, Tag, User } from "lucide-react";
import { auth } from "@/auth";
import { getSeriesById, getMySeriesFollow } from "@/lib/actions/data-series";
import { canManageChurchFromSession } from "@/lib/permissions";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";
import { EventCard } from "@/domains/events/components/event-card";
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
  return {
    title: series ? `${series.name} — One Another` : "Series Not Found",
  };
}

export default async function SeriesDetailPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);

  const [series, myFollow] = await Promise.all([
    getSeriesById(id),
    session?.user?.id
      ? getMySeriesFollow(id, session.user.id)
      : Promise.resolve(null),
  ]);

  if (!series) notFound();

  const canManage = canManageChurchFromSession(session, series.churchId);
  const isFollowing = myFollow !== null;

  return (
    <div className="bg-background">
      <HeroBanner size="sm" photoUrl={series.photoUrl ?? undefined} />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl leading-snug font-bold">{series.name}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap">
                {CADENCE_LABELS[series.cadence] ?? series.cadence}
              </span>
              {canManage && (
                <>
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="size-9"
                  >
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
            {series.church && (
              <InfoField icon={Church} label="Church">
                <Link
                  href={`/churches/${series.church.id}`}
                  className="text-primary hover:underline"
                >
                  {series.church.name}
                </Link>
              </InfoField>
            )}
            <InfoField icon={MapPin} label="Location">
              {series.location}
            </InfoField>
            <InfoField icon={User} label="Host">
              {series.host}
            </InfoField>
            <InfoField icon={Tag} label="Category">
              {series.tag}
            </InfoField>
          </div>
        </div>

        {/* Description card */}
        <div className="shadow-card rounded-2xl bg-white p-5">
          <p className="text-foreground text-sm leading-relaxed">
            {series.description}
          </p>
        </div>

        {/* Upcoming sessions */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Sessions</h2>
            {canManage && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link href={`/events/create?seriesId=${series.id}`}>
                  <Plus className="size-3.5" />
                  Add Session
                </Link>
              </Button>
            )}
          </div>
          {series.events.length === 0 ? (
            <p className="text-muted-foreground py-4 text-center text-sm">
              No upcoming sessions
            </p>
          ) : (
            series.events.map((event) => (
              <EventCard
                key={event.id}
                event={{
                  ...event,
                  badge: event.tag,
                  churchName: series.church?.name ?? "",
                }}
              />
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
