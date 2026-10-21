import { notFound, redirect } from "next/navigation";
import { getEventById } from "@/domains/events/actions/data";
import { getEventResponses } from "@/domains/events/questions/actions";
import { getAbility, eventSubject } from "@/domains/roles";
import { PageHeader } from "@/components/ui/page-header";
import { ResponsesTable } from "./_components/responses-table";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? `Responses — ${event.title}` : "Responses" };
}

export default async function EventResponsesPage({ params }: Props) {
  const [{ id }, ability] = await Promise.all([params, getAbility()]);

  const event = await getEventById(id);
  if (!event) notFound();

  if (!ability.can("view_attendees", eventSubject(event)))
    redirect(`/events/${id}`);

  const { questions, attendees } = await getEventResponses(id);

  return (
    <div className="flex flex-col pb-28">
      <PageHeader title="Responses" description={event.title} />

      <div className="flex flex-col gap-6 px-4">
        {questions.length === 0 ? (
          <div className="shadow-card flex flex-col items-center gap-3 rounded-2xl border bg-white p-8">
            <p className="text-muted-foreground text-center text-sm">
              This event has no custom questions.
            </p>
          </div>
        ) : (
          <div className="shadow-card rounded-2xl border bg-white p-4">
            <ResponsesTable
              questions={questions}
              attendees={attendees}
              eventTitle={event.title}
            />
          </div>
        )}
      </div>
    </div>
  );
}
