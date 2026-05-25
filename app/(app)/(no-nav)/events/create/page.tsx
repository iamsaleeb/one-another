import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EventWizard } from "./_components/event-wizard";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import { getSeriesForEvent } from "@/domains/series/actions/data";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";

interface Props {
  searchParams: Promise<{ seriesId?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const session = await auth();

  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    redirect("/");
  }

  const { seriesId } = await searchParams;

  const managedIds = [
    ...(session.user.organiserChurchIds ?? []),
    ...(session.user.adminChurchIds ?? []),
  ];
  const [churches, series, libraryItems] = await Promise.all([
    getChurchesByIds(managedIds),
    seriesId ? getSeriesForEvent(seriesId) : null,
    getQuestionLibraryForUser(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={series ? "Add Session" : "Create Event"} />
      <div className="px-4 pb-6">
        <EventWizard
          churches={churches}
          series={
            series
              ? {
                  id: series.id,
                  name: series.name,
                  churchId: series.church.id,
                  churchName: series.church.name,
                }
              : undefined
          }
          libraryItems={libraryItems}
        />
      </div>
    </div>
  );
}
