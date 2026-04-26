import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EventWizard } from "./_components/event-wizard";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByManager } from "@/lib/actions/data-churches";
import { getSeriesForEvent } from "@/lib/actions/data-series";

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
        <EventWizard
          churches={churches}
          series={series ? { id: series.id, name: series.name, churchId: series.church.id, churchName: series.church.name } : undefined}
        />
      </div>
    </div>
  );
}
