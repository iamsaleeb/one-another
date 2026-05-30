import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEventById } from "@/domains/events/actions/data";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import {
  getEventQuestions,
  hasEventResponses,
} from "@/domains/events/questions/actions";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";
import { getEventStaffForUser } from "@/domains/roles/dal/event-staff";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { parseEventMetadata } from "@/domains/events/validations/event";
import { PageHeader } from "@/components/ui/page-header";
import { EventWizard } from "@/app/(app)/(no-nav)/events/create/_components/event-wizard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, session] = await Promise.all([getEventById(id), auth()]);

  if (!session) redirect("/");
  if (!event) notFound();

  const claims = sessionToClaims(session);
  const churchMemberships = session.user.churchMemberships ?? [];
  // Only churches where user has event:update — excludes EVENT_CREATOR
  const editableChurchIds = churchMemberships
    .filter(
      (m) =>
        claims &&
        can(claims, Capabilities.EVENT_UPDATE, {
          scope: "CHURCH",
          churchId: m.churchId,
        })
    )
    .map((m) => m.churchId);

  const [churchesFromMemberships, questions, libraryItems, questionsLocked] =
    await Promise.all([
      getChurchesByIds(editableChurchIds),
      getEventQuestions(id),
      getQuestionLibraryForUser(session.user.id),
      hasEventResponses(id),
    ]);

  let churches = churchesFromMemberships;
  if (!churches.some((c) => c.id === event.churchId)) {
    if (!session.user.isPlatformAdmin) {
      const staff = await getEventStaffForUser(session.user.id, id);
      if (!staff) notFound();
    }
    // Platform admins and event staff are limited to the event's own church
    if (event.church) {
      churches = [event.church];
    } else {
      notFound();
    }
  }

  const datetimeISO = event.datetime?.toISOString() ?? "";
  const { registration, camp } = parseEventMetadata(event.metadata);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Event" />
      <div className="px-4 pb-6">
        <EventWizard
          eventId={event.id}
          churches={churches}
          libraryItems={libraryItems}
          questionsLocked={questionsLocked}
          series={
            event.seriesId && event.series?.name
              ? {
                  id: event.seriesId,
                  name: event.series.name,
                  churchId: event.churchId ?? "",
                  churchName:
                    churches.find((c) => c.id === event.churchId)?.name ?? "",
                }
              : undefined
          }
          defaultValues={{
            title: event.title,
            datetimeISO,
            location: event.location ?? "",
            host: event.host ?? "",
            tag: event.tag,
            description: event.description,
            churchId: event.churchId ?? "",
            seriesId: event.seriesId ?? undefined,
            requiresRegistration: event.requiresRegistration,
            capacity: registration.capacity ?? undefined,
            collectPhone: registration.collectPhone,
            collectNotes: registration.collectNotes,
            price: event.price ?? undefined,
            isDraft: event.isDraft,
            photoUrl: event.photoUrl ?? undefined,
            campEndDate: camp?.endDate ?? undefined,
            campAllowPartialRegistration:
              camp?.allowPartialRegistration ?? false,
            campAgenda: camp?.agenda ?? [],
            questions: questions.map((q) => ({
              ...q,
              libraryItemId: q.libraryItemId ?? undefined,
            })),
          }}
        />
      </div>
    </div>
  );
}
