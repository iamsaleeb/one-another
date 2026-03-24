import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getEventById, getChurchesByOrganiser } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { EditEventForm } from "./_components/edit-event-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, session] = await Promise.all([getEventById(id), auth()]);

  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");
  if (!event) notFound();

  const churches = await getChurchesByOrganiser(session.user.id);

  const [date, fullTime] = event.datetime.toISOString().split("T");
  const time = fullTime.slice(0, 5);

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
            requiresRegistration: event.requiresRegistration,
            capacity: event.capacity,
            collectPhone: event.collectPhone,
            collectNotes: event.collectNotes,
            price: event.price,
          }}
          churches={churches}
        />
        </div>
      </div>
    </div>
  );
}
