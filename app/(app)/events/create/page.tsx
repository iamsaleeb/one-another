import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateEventForm } from "./_components/create-event-form";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByManager, getSeriesForEvent } from "@/lib/actions/data";

interface Props {
  searchParams: Promise<{ seriesId?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const session = await auth();

  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const { seriesId } = await searchParams;

  const [churches, series] = await Promise.all([
    getChurchesByManager(session.user.id),
    seriesId ? getSeriesForEvent(seriesId) : null,
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={series ? "Add Session" : "Create Event"} />
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-white shadow-card p-5">
          <CreateEventForm
            churches={churches}
            series={series ? { id: series.id, name: series.name, churchId: series.church.id, churchName: series.church.name } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
