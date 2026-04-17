import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getEventsByCreator, getEventsNotByCreator } from "@/lib/actions/data-events";
import { getSeriesByCreator, getSeriesNotByCreator } from "@/lib/actions/data-series";
import { OrganiserTabs } from "./_components/organiser-tabs";

export default async function OrganiserPage() {
  const session = await auth();

  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const userId = session.user.id;

  const [myEvents, mySeries, communityEvents, communitySeries] = await Promise.all([
    getEventsByCreator(userId),
    getSeriesByCreator(userId),
    getEventsNotByCreator(userId),
    getSeriesNotByCreator(userId),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Organiser Tools" />
      <OrganiserTabs
        myEvents={myEvents}
        mySeries={mySeries}
        communityEvents={communityEvents}
        communitySeries={communitySeries}
      />
    </div>
  );
}
