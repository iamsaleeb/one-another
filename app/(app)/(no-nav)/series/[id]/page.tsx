import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Church, MapPin, Pencil, Plus, Tag, User } from "lucide-react";
import { auth } from "@/auth";
import {
  getSeriesById,
  getMySeriesFollow,
} from "@/domains/series/actions/data";
import {
  getAbility,
  getSessionUserId,
  eventSubject,
  seriesSubject,
} from "@/domains/roles";
import { InfoField } from "@/components/info-field";
import { HeroBanner } from "@/components/hero-banner";
import { EventCard } from "@/domains/events/components/event-card";
import { SaveEventButton } from "@/domains/events/components/save-event-button";
import { Button } from "@/components/ui/button";
import { DeleteSeriesButton } from "./_components/delete-series-button";
import { FollowSeriesButton } from "./_components/follow-series-button";
import { CADENCE_LABELS } from "@/lib/types/search";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  AccessMenuTrigger,
} from "@/domains/access-requests";

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
  const [{ id }, ability, userId, session] = await Promise.all([
    params,
    getAbility(),
    getSessionUserId(),
    auth(),
  ]);

  const [series, myFollow] = await Promise.all([
    getSeriesById(id),
    userId ? getMySeriesFollow(id, userId) : Promise.resolve(null),
  ]);

  if (!series) notFound();

  const canEdit = ability.can("update", seriesSubject(series));
  const canDelete = ability.can("delete", seriesSubject(series));
  const canAddSession = ability.can(
    "create",
    eventSubject({ churchId: series.churchId, seriesId: series.id })
  );
  const canManageHelpers = ability.can("manage_staff", seriesSubject(series));
  const isFollowing = myFollow !== null;

  const [myAccessRequest, pendingAccessRequests] = await Promise.all([
    userId
      ? getMyRequestForResource("SERIES", series.id, userId)
      : Promise.resolve(null),
    canManageHelpers
      ? getPendingRequestsForResource("SERIES", series.id)
      : Promise.resolve([]),
  ]);

  return (
    <div className="bg-background">
      <HeroBanner size="sm" photoUrl={series.photoUrl ?? undefined} />

      <div className="flex justify-end gap-2 px-4 pt-4">
        <AccessMenuTrigger
          resourceType="SERIES"
          resourceId={series.id}
          resourceName={series.name}
          isAuthenticated={!!userId}
          hasContributorAccess={canAddSession}
          myRequest={myAccessRequest ?? null}
          pendingCount={pendingAccessRequests.length}
          isApprover={canManageHelpers}
        />
      </div>

      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Info card */}
        <Card className="gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl leading-snug font-bold">{series.name}</h1>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="soft">
                {CADENCE_LABELS[series.cadence] ?? series.cadence}
              </Badge>
              {canEdit && (
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
              )}
              {canDelete && <DeleteSeriesButton seriesId={series.id} />}
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
        </Card>

        {/* Description card */}
        <Card className="gap-0 p-5">
          <p className="text-foreground text-sm leading-relaxed">
            {series.description}
          </p>
        </Card>

        {/* Upcoming sessions */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Upcoming Sessions</h2>
            {canAddSession && (
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
                saveButton={
                  <SaveEventButton
                    eventId={event.id}
                    initialSaved={false}
                    isAuthenticated={!!userId}
                  />
                }
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
