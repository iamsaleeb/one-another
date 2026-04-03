import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getEventById, getChurchesByManager } from "@/lib/actions/data";
import { parseEventMetadata } from "@/lib/types/event-metadata";
import { PageHeader } from "@/components/ui/page-header";
import { EditEventForm } from "./_components/edit-event-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditEventPage({ params }: Props) {
  const { id } = await params;
  const [event, session] = await Promise.all([getEventById(id), auth()]);

  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");
  if (!event) notFound();

  const churches = await getChurchesByManager(session.user.id);
  if (!churches.some((c) => c.id === event.churchId)) notFound();

  const [date, fullTime] = event.datetime.toISOString().split("T");
  const time = fullTime.slice(0, 5);
  const { registration } = parseEventMetadata(event.metadata);

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
            capacity: registration.capacity,
            collectPhone: registration.collectPhone,
            collectNotes: registration.collectNotes,
            price: event.price,
            isDraft: event.isDraft,
            photoUrl: event.photoUrl,
          }}
          churches={churches}
        />
        </div>
      </div>
    </div>
  );
}
