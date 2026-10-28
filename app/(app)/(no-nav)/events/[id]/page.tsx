import { Card } from "@/components/ui/card";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  Church,
  FileEdit,
  MapPin,
  Pencil,
  Repeat,
  TableProperties,
  User,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import {
  getEventById,
  getEventAttendees,
  getMyEventAttendance,
  getIsEventSaved,
} from "@/domains/events/actions/data";
import {
  getEventQuestions,
  getMyResponses,
} from "@/domains/events/questions/actions";
import {
  parseEventMetadata,
  parseEventAttendeeMetadata,
} from "@/domains/events/validations/event";
import { getAbility, getSessionUserId, eventSubject } from "@/domains/roles";
import { EventDatetime } from "@/domains/events/components/event-datetime";
import { hasHappened } from "@/domains/events/lib/timing";
import { LiveBadge } from "@/domains/events/components/live-badge";
import { getEventDays } from "@/lib/datetime";
import { InfoField } from "@/components/info-field";
import { HeroBanner } from "@/components/hero-banner";
import { DeleteEventButton } from "./_components/delete-event-button";
import { CancelEventButton } from "./_components/cancel-event-button";
import { UncancelEventButton } from "./_components/uncancel-event-button";
import { EventActionBar } from "./_components/event-action-bar";
import { CampAgenda } from "./_components/camp-agenda";
import { SaveEventButton } from "@/domains/events/components/save-event-button";
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
  const event = await getEventById(id);
  if (!event) return { title: "Event Not Found" };
  if (event.isDraft) {
    const ability = await getAbility();
    if (!ability.can("update", eventSubject(event)))
      return { title: "Event Not Found" };
  }
  const description = event.description.slice(0, 160);
  return {
    title: `${event.title} — One Another`,
    description,
    openGraph: {
      title: event.title,
      description,
      ...(event.photoUrl
        ? { images: [{ url: event.photoUrl, width: 1200, height: 630 }] }
        : {}),
    },
  };
}

export default async function EventDetailPage({ params }: Props) {
  const [{ id }, ability, userId, session] = await Promise.all([
    params,
    getAbility(),
    getSessionUserId(),
    auth(),
  ]);

  const [event, myAttendance, isSaved] = await Promise.all([
    getEventById(id),
    userId ? getMyEventAttendance(id, userId) : Promise.resolve(null),
    userId ? getIsEventSaved(id, userId) : Promise.resolve(false),
  ]);

  if (!event) notFound();

  const isAttending = myAttendance !== null;
  const happened = hasHappened(event);

  const subject = eventSubject(event);
  const canEdit = ability.can("update", subject);
  // Only a draft is deleted; a published Event is cancelled instead.
  const canDelete = event.isDraft && ability.can("delete", subject);
  const canViewAttendees = ability.can("view_attendees", subject);
  const canManageStaff = ability.can("manage_staff", subject);

  const [myAccessRequest, pendingAccessRequests] = await Promise.all([
    userId
      ? getMyRequestForResource("EVENT", id, userId)
      : Promise.resolve(null),
    canManageStaff
      ? getPendingRequestsForResource("EVENT", id)
      : Promise.resolve([]),
  ]);

  const questions = await getEventQuestions(id);

  if (event.isDraft && !canEdit) notFound();

  const [attendees, myResponses] = await Promise.all([
    canViewAttendees ? getEventAttendees(id) : Promise.resolve(undefined),
    userId && questions.length > 0 && isAttending
      ? getMyResponses(id, userId)
      : Promise.resolve(
          {} as Record<
            string,
            { answer: string | null; fileUrl: string | null }
          >
        ),
  ]);

  const { registration, camp } = parseEventMetadata(event.metadata);
  // The days a camp open to partial attendance can be attended: its start to
  // its end, like any Event's.
  const campDays =
    camp?.allowPartialRegistration && event.datetime && event.endDatetime
      ? getEventDays(event.datetime, event.endDatetime)
      : [];
  const myAttendeeMeta = myAttendance
    ? parseEventAttendeeMetadata(myAttendance.metadata)
    : undefined;

  return (
    <div className="bg-background">
      <HeroBanner size="md" photoUrl={event.photoUrl ?? undefined} />

      <div className="flex justify-end gap-2 px-4 pt-4">
        <SaveEventButton
          eventId={id}
          initialSaved={isSaved}
          isAuthenticated={!!userId}
        />
        <AccessMenuTrigger
          resourceType="EVENT"
          resourceId={id}
          resourceName={event.title}
          isAuthenticated={!!userId}
          hasContributorAccess={canEdit}
          myRequest={myAccessRequest ?? null}
          pendingCount={pendingAccessRequests.length}
          isApprover={canManageStaff}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Draft banner */}
        {event.isDraft && (
          <Alert className="border-warning/30 bg-warning/10 text-warning [&>svg]:text-warning">
            <FileEdit className="size-4" />
            <AlertTitle>This event is a draft.</AlertTitle>
            <AlertDescription className="text-warning/80">
              Only organisers can see this page.
            </AlertDescription>
          </Alert>
        )}

        {/* Cancellation banner */}
        {event.cancelledAt && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>This event has been cancelled.</AlertTitle>
            {event.cancellationReason && (
              <AlertDescription>{event.cancellationReason}</AlertDescription>
            )}
          </Alert>
        )}

        {/* Info card */}
        <Card className="gap-4 p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col items-start gap-2">
              <LiveBadge event={event} />
              <h1 className="text-xl leading-snug font-bold">{event.title}</h1>
            </div>
            {canEdit && (
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
                  {/* An Event that has happened is read-only. */}
                  {!happened && (
                    <Button
                      asChild
                      variant="outline"
                      size="icon"
                      className="size-9"
                    >
                      <Link href={`/events/${id}/edit`} aria-label="Edit event">
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                  )}
                  {happened ? null : event.cancelledAt ? (
                    <UncancelEventButton eventId={id} />
                  ) : (
                    <CancelEventButton eventId={id} />
                  )}
                  {canDelete && <DeleteEventButton eventId={id} />}
                </div>
                {canViewAttendees &&
                  event.requiresRegistration &&
                  questions.length > 0 && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-2"
                    >
                      <Link href={`/events/${id}/responses`}>
                        <TableProperties className="mr-1.5 size-4" />
                        View responses
                      </Link>
                    </Button>
                  )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {event.church && (
              <InfoField icon={Church} label="Church">
                <Link
                  href={`/churches/${event.church.id}`}
                  className="text-primary hover:underline"
                >
                  {event.church.name}
                </Link>
              </InfoField>
            )}
            <InfoField icon={User} label="Host">
              {event.host ?? "TBD"}
            </InfoField>
            <InfoField icon={Calendar} label="Date & Time">
              <span className="flex flex-col">
                <EventDatetime datetime={event.datetime} />
                {event.endDatetime && (
                  <span>
                    &rarr; <EventDatetime datetime={event.endDatetime} />
                  </span>
                )}
              </span>
            </InfoField>
            <InfoField icon={MapPin} label="Location">
              {event.location ?? "TBD"}
            </InfoField>
            {event.series && (
              <InfoField icon={Repeat} label="Part of Series">
                <Link
                  href={`/series/${event.series.id}`}
                  className="text-primary hover:underline"
                >
                  {event.series.name}
                </Link>
              </InfoField>
            )}
          </div>
        </Card>

        {/* Tag label */}
        <p className="text-muted-foreground text-center text-xs font-bold tracking-widest uppercase">
          | {event.tag} |
        </p>

        {/* Description card */}
        <Card className="gap-0 p-5">
          <p className="text-foreground text-sm leading-relaxed">
            {event.description}
          </p>
        </Card>

        {/* Camp agenda */}
        {camp && camp.agenda.length > 0 && <CampAgenda agenda={camp.agenda} />}
      </div>

      <EventActionBar
        eventId={event.id}
        eventTitle={event.title}
        requiresRegistration={event.requiresRegistration}
        isAttending={isAttending}
        isAuthenticated={!!userId}
        userName={session?.user?.name ?? ""}
        capacity={registration.capacity}
        spotsUsed={event._count.attendees}
        collectPhone={registration.collectPhone}
        collectNotes={registration.collectNotes}
        price={event.price}
        isCancelled={!!event.cancelledAt}
        isDraft={event.isDraft}
        attendees={attendees}
        campDays={campDays}
        questions={questions}
        existingResponses={myResponses}
        existingSelectedDays={myAttendeeMeta?.selectedDays}
      />
    </div>
  );
}
