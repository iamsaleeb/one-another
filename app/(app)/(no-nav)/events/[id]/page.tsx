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
import { getActor } from "@/domains/roles/lib/session";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { EventDatetime } from "@/domains/events/components/event-datetime";
import { formatDateOnly, parseDateOfBirth } from "@/lib/datetime";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";
import { DeleteEventButton } from "./_components/delete-event-button";
import { CancelEventButton } from "./_components/cancel-event-button";
import { UncancelEventButton } from "./_components/uncancel-event-button";
import { EventActionBar } from "./_components/event-action-bar";
import { CampAgenda } from "./_components/camp-agenda";
import { SaveEventButton } from "@/domains/events/components/save-event-button";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event Not Found" };
  if (event.isDraft) {
    const actor = await getActor();
    const access = await actor.loadContext({
      churchId: event.churchId,
      eventId: id,
      seriesId: event.seriesId ?? undefined,
    });
    if (!access.can(Capabilities.EVENT_UPDATE))
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
  const [{ id }, actor, session] = await Promise.all([
    params,
    getActor(),
    auth(),
  ]);

  const userId = actor.isAuthenticated ? actor.id : null;

  const [event, myAttendance, isSaved] = await Promise.all([
    getEventById(id),
    userId ? getMyEventAttendance(id, userId) : Promise.resolve(null),
    userId ? getIsEventSaved(id, userId) : Promise.resolve(false),
  ]);

  if (!event) notFound();

  const isAttending = myAttendance !== null;

  const access = await actor.loadContext({
    churchId: event.churchId,
    eventId: id,
    seriesId: event.seriesId ?? undefined,
  });

  const canEdit = access.can(Capabilities.EVENT_UPDATE);
  const canDelete = access.can(Capabilities.EVENT_DELETE);
  const canViewAttendees = access.can(Capabilities.EVENT_VIEW_ATTENDEES);
  const canManageStaff = access.can(Capabilities.EVENT_MANAGE_STAFF);

  const [myApprovalRequest, pendingApprovalRequests] = await Promise.all([
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
        <ApprovalMenuTrigger
          resourceType="EVENT"
          resourceId={id}
          resourceName={event.title}
          isAuthenticated={!!userId}
          hasContributorAccess={canEdit}
          myRequest={myApprovalRequest ?? null}
          pendingCount={pendingApprovalRequests.length}
          isApprover={canManageStaff}
        />
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Draft banner */}
        {event.isDraft && (
          <Alert className="border-amber-200 bg-amber-50 text-amber-700 [&>svg]:text-amber-600">
            <FileEdit className="size-4" />
            <AlertTitle>This event is a draft.</AlertTitle>
            <AlertDescription className="text-amber-600/80">
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
        <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl leading-snug font-bold">{event.title}</h1>
            {canEdit && (
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex items-center gap-2">
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
                  {event.cancelledAt ? (
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
            <InfoField icon={Calendar} label={camp ? "Dates" : "Date & Time"}>
              {camp ? (
                <span>
                  <EventDatetime datetime={event.datetime} />
                  {camp.endDate && (
                    <>
                      {" "}
                      &rarr; {formatDateOnly(parseDateOfBirth(camp.endDate))}
                    </>
                  )}
                </span>
              ) : (
                <EventDatetime datetime={event.datetime} />
              )}
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
        </div>

        {/* Tag label */}
        <p className="text-muted-foreground text-center text-xs font-bold tracking-widest uppercase">
          | {event.tag} |
        </p>

        {/* Description card */}
        <div className="shadow-card rounded-2xl bg-white p-5">
          <p className="text-foreground text-sm leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Camp agenda */}
        {camp && camp.agenda.length > 0 && (
          <CampAgenda
            agenda={camp.agenda}
            startDate={event.datetime?.toISOString().slice(0, 10) ?? ""}
            endDate={camp.endDate}
          />
        )}
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
        camp={camp}
        campStartDate={event.datetime?.toISOString().slice(0, 10) ?? ""}
        questions={questions}
        existingResponses={myResponses}
        existingSelectedDays={myAttendeeMeta?.selectedDays}
      />
    </div>
  );
}
