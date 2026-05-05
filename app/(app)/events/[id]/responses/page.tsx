import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getEventById } from "@/lib/actions/data-events";
import { getEventResponses } from "@/lib/actions/data-questions";
import { canManageChurch } from "@/lib/permissions";
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

  const canManage = await canManageChurch(session?.user?.id, session?.user?.role, event.churchId);
  if (!canManage) redirect(`/events/${id}`);

  const { questions, attendees } = await getEventResponses(id);

  return (
    <div className="flex flex-col gap-6 px-4 pt-6 pb-28">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">Responses</h1>
        <p className="text-sm text-muted-foreground">{event.title}</p>
      </div>

      {questions.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-card p-8 flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground text-center">
            This event has no custom questions.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-card p-4">
          <ResponsesTable
            questions={questions}
            attendees={attendees}
            eventTitle={event.title}
          />
        </div>
      )}
    </div>
  );
}
