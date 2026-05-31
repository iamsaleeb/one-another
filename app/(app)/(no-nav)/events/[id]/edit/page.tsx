import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEventById } from "@/domains/events/actions/data";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import {
  getEventQuestions,
  hasEventResponses,
} from "@/domains/events/questions/actions";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";
import { sessionToActor } from "@/domains/roles/lib/session";
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

  const actor = sessionToActor(session);

  // Access check — can this user edit this specific event?
  const canAccess =
    !!actor &&
    (await can(actor, Capabilities.EVENT_UPDATE, {
      churchId: event.churchId ?? "",
      eventId: id,
    }));
  if (!canAccess) notFound();

  // UI: which churches to show in the church-change dropdown
  // Use JWT memberships (acceptable slight staleness for UI only)
  const churchMemberships = session.user.churchMemberships ?? [];
  const editableChurchIds = churchMemberships
    .filter((m) => m.role === "CHURCH_ADMIN" || m.role === "EVENT_MANAGER")
    .map((m) => m.churchId);

  const [churches, questions, libraryItems, questionsLocked] = await Promise.all([
    editableChurchIds.length > 0
      ? getChurchesByIds(editableChurchIds)
      : event.church
        ? Promise.resolve([event.church])
        : Promise.resolve([]),
    getEventQuestions(id),
    getQuestionLibraryForUser(session.user.id),
    hasEventResponses(id),
  ]);

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
