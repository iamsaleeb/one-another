import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getEventById, getChurches } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { EditEventForm } from "./_components/edit-event-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, session, churches] = await Promise.all([
    getEventById(id),
    auth(),
    getChurches(),
  ]);

  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");
  if (!event) notFound();

  const [date, time] = event.datetime.split("T");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Event" />
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-white shadow-card p-5">
          <EditEventForm
          event={{
            id: event.id,
            title: event.title,
            date,
            time,
            location: event.location,
            host: event.host,
            tag: event.tag,
            description: event.description,
            churchId: event.churchId,
            seriesId: event.seriesId,
            seriesName: event.series?.name,
          }}
          churches={churches}
        />
        </div>
      </div>
    </div>
  );
}
