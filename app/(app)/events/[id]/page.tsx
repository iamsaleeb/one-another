import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, Calendar, FileEdit, MapPin, Pencil, Repeat, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { auth } from "@/auth";
import { getEventById, getEventAttendees } from "@/lib/actions/data";
import { canManageChurch } from "@/lib/permissions";
import { formatEventDatetime } from "@/lib/utils";
import { InfoField } from "@/components/ui/info-field";
import { HeroBanner } from "@/components/ui/hero-banner";
import { DeleteEventButton } from "./_components/delete-event-button";
import { CancelEventButton } from "./_components/cancel-event-button";
import { UncancelEventButton } from "./_components/uncancel-event-button";
import { EventActionBar } from "./_components/event-action-bar";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const [event, session] = await Promise.all([getEventById(id), auth()]);
  if (!event) return { title: "Event Not Found" };
  if (event.isDraft) {
    const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);
    if (!canManage) return { title: "Event Not Found" };
  }
  return { title: `${event.title} — One Another` };
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const [event, session] = await Promise.all([getEventById(id), auth()]);

  if (!event) notFound();

  const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);

  if (event.isDraft && !canManage) notFound();
  const attendees = canManage ? await getEventAttendees(id) : undefined;

  const isAttending = session?.user?.id
    ? event.attendees.some((a) => a.userId === session.user.id)
    : false;

  return (
    <div className="bg-background">
      <HeroBanner size="md" />

      {/* Content */}
      <div className="flex flex-col gap-4 px-4 pt-5 pb-28">
        {/* Draft banner */}
        {event.isDraft && (
          <div className="rounded-2xl bg-amber-50 p-4 flex items-start gap-3">
            <FileEdit className="size-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-amber-700">This event is a draft.</p>
              <p className="text-sm text-amber-600/80">Only organisers can see this page.</p>
            </div>
          </div>
        )}

        {/* Cancellation banner */}
        {event.cancelledAt && (
          <div className="rounded-2xl bg-destructive/10 p-4 flex items-start gap-3">
            <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-semibold text-destructive">This event has been cancelled.</p>
              {event.cancellationReason && (
                <p className="text-sm text-destructive/80">{event.cancellationReason}</p>
              )}
            </div>
          </div>
        )}

        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold leading-snug">{event.title}</h1>
            {canManage && (
              <div className="flex items-center gap-2 shrink-0">
                <Button asChild variant="outline" size="icon" className="size-9">
                  <Link href={`/events/${id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                {event.cancelledAt
                  ? <UncancelEventButton eventId={id} />
                  : <CancelEventButton eventId={id} />
                }
                <DeleteEventButton eventId={id} />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <InfoField icon={User} label="Host">{event.host}</InfoField>
            <InfoField icon={Calendar} label="Date & Time">{formatEventDatetime(event.datetime)}</InfoField>
            <InfoField icon={MapPin} label="Location">{event.location}</InfoField>
            {event.series && (
              <InfoField icon={Repeat} label="Part of Series">
                <Link href={`/series/${event.series.id}`} className="text-primary hover:underline">
                  {event.series.name}
                </Link>
              </InfoField>
            )}
          </div>
        </div>

        {/* Tag label */}
        <p className="text-xs font-bold text-muted-foreground tracking-widest text-center uppercase">
          | {event.tag} |
        </p>

        {/* Description card */}
        <div className="rounded-2xl bg-white shadow-card p-5">
          <p className="text-sm text-foreground leading-relaxed">
            {event.description}
          </p>
        </div>
      </div>

      <EventActionBar
        eventId={event.id}
        eventTitle={event.title}
        requiresRegistration={event.requiresRegistration}
        isAttending={isAttending}
        userName={session?.user?.name ?? ""}
        userEmail={session?.user?.email ?? ""}
        capacity={event.capacity}
        spotsUsed={event._count.attendees}
        collectPhone={event.collectPhone}
        collectNotes={event.collectNotes}
        price={event.price}
        isCancelled={!!event.cancelledAt}
        isDraft={event.isDraft}
        attendees={attendees}
      />
    </div>
  );
}
