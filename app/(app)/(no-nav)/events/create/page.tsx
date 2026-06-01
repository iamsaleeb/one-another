import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EventWizard } from "./_components/event-wizard";
import { PageHeader } from "@/components/ui/page-header";
import { getChurches, getChurchesByIds } from "@/domains/churches/actions/data";
import { getSeriesForEvent } from "@/domains/series/actions/data";
import { getSeriesStaffForUser } from "@/domains/roles/dal/series-staff";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";

interface Props {
  searchParams: Promise<{ seriesId?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/");

  const churchMemberships = session.user.churchMemberships ?? [];
  const { seriesId } = await searchParams;

  if (!session.user.isPlatformAdmin && churchMemberships.length === 0) {
    if (!seriesId) {
      redirect("/");
    } else {
      const seriesStaff = await getSeriesStaffForUser(
        session.user.id,
        seriesId
      );
      if (!seriesStaff) redirect("/");
    }
  }

  const managedIds = churchMemberships.map((m) => m.churchId);
  const [churches, series, libraryItems] = await Promise.all([
    session.user.isPlatformAdmin ? getChurches() : getChurchesByIds(managedIds),
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
