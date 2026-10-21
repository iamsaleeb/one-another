import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/domains/events/actions/data";
import {
  getEventQuestions,
  hasEventResponses,
} from "@/domains/events/questions/actions";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";
import {
  eventSubject,
  getAbility,
  getChurchTargets,
  getSessionUserId,
} from "@/domains/roles";
import { parseEventMetadata } from "@/domains/events/validations/event";
import { PageHeader } from "@/components/ui/page-header";
import { EventWizard } from "@/app/(app)/(no-nav)/events/create/_components/event-wizard";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, userId, ability] = await Promise.all([
    getEventById(id),
    getSessionUserId(),
    getAbility(),
  ]);

  if (!userId) redirect("/");
  if (!event) notFound();
  if (!ability.can("update", eventSubject(event))) notFound();

  // Church dropdown: Churches the Event could be moved to, plus its own.
  const [targets, questions, libraryItems, questionsLocked] = await Promise.all(
    [
      getChurchTargets("create_event", ability),
      getEventQuestions(id),
      getQuestionLibraryForUser(userId),
      hasEventResponses(id),
    ]
  );
  const churches =
    event.church && !targets.some((c) => c.id === event.churchId)
      ? [event.church, ...targets]
      : targets;

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
