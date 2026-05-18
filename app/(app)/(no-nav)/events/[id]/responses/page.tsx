import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEventById } from "@/lib/actions/data-events";
import { getEventResponses } from "@/lib/actions/data-questions";
import { canManageChurchFromSession } from "@/lib/permissions";
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
  const [{ id }, session] = await Promise.all([params, auth()]);

  const event = await getEventById(id);
  if (!event) notFound();

  const canManage = canManageChurchFromSession(session, event.churchId ?? "");
  if (!canManage) redirect(`/events/${id}`);

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
