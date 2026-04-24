import { notFound } from "next/navigation";
import Link from "next/link";
import { Church, MapPin, Pencil, Plus, Tag, User } from "lucide-react";
import { auth } from "@/auth";
import { getSeriesById } from "@/lib/actions/data-series";
import { canManageChurch } from "@/lib/permissions";
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
  const [{ id }, session] = await Promise.all([params, auth()]);
  const series = await getSeriesById(id, session?.user?.id ?? undefined);

  if (!series) notFound();

  const canManage = await canManageChurch(session?.user?.id, session?.user?.role, series.churchId);
  const isFollowing = series.followers.length > 0;

  return (
    <div className="bg-background">
      <HeroBanner size="sm" photoUrl={series.photoUrl ?? undefined} />

      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{series.name}</h1>
            <div className="flex items-center gap-2 shrink-0">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                {CADENCE_LABELS[series.cadence] ?? series.cadence}
              </span>
              {canManage && (
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
            {series.church && (
              <InfoField icon={Church} label="Church">
                <Link href={`/churches/${series.church.id}`} className="text-primary hover:underline">
                  {series.church.name}
                </Link>
              </InfoField>
            )}
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
            <p className="text-sm text-muted-foreground py-4 text-center">No upcoming sessions</p>
          ) : (
            series.events.map((event) => (
              <EventCard key={event.id} event={{ ...event, badge: event.tag, churchName: series.church?.name ?? "" }} />
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
