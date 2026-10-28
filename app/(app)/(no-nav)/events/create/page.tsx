import { redirect } from "next/navigation";
import { EventWizard } from "./_components/event-wizard";
import { PageHeader } from "@/components/page-header";
import { getSeriesForEvent } from "@/domains/series/actions/data";
import { getQuestionLibraryForUser } from "@/domains/events/questions/dal";
import {
  eventSubject,
  getAbility,
  getChurchTargets,
  getSessionUserId,
} from "@/domains/roles";

interface Props {
  searchParams: Promise<{ seriesId?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const [userId, ability, { seriesId }] = await Promise.all([
    getSessionUserId(),
    getAbility(),
    searchParams,
  ]);
  if (!userId) redirect("/");

  const [churches, series, libraryItems] = await Promise.all([
    getChurchTargets("create_event", ability),
    seriesId ? getSeriesForEvent(seriesId) : null,
    getQuestionLibraryForUser(userId),
  ]);

  // Adding a session needs authority over that Series (Church or Series
  // Grant); a standalone Event needs at least one Church to place it in.
  if (seriesId) {
    if (
      !series ||
      !ability.can(
        "create",
        eventSubject({ churchId: series.church.id, seriesId: series.id })
      )
    )
      redirect("/");
  } else if (churches.length === 0) {
    redirect("/");
  }

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
