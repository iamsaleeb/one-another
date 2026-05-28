import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  getEventsByCreatorPaged,
  getEventsNotByCreatorPaged,
} from "@/domains/events/actions/data";
import {
  getSeriesByCreator,
  getSeriesNotByCreator,
} from "@/domains/series/actions/data";
import { OrganiserTabs } from "./_components/organiser-tabs";

export default async function OrganiserPage() {
  const session = await auth();
  const churchMemberships = session?.user?.churchMemberships ?? [];

  if (!session?.user?.isPlatformAdmin && churchMemberships.length === 0) {
    redirect("/");
  }

  const userId = session!.user.id;

  const [myEventsPage, mySeries, communityEventsPage, communitySeries] =
    await Promise.all([
      getEventsByCreatorPaged(userId, null),
      getSeriesByCreator(userId),
      getEventsNotByCreatorPaged(userId, null),
      getSeriesNotByCreator(userId),
    ]);

  return (
    <div className="flex flex-col">
      <PageHeader title="Organiser Tools" />
      <OrganiserTabs
        myItems={myEventsPage.items}
        myCursor={myEventsPage.nextCursor}
        mySeries={mySeries}
        communityItems={communityEventsPage.items}
        communityCursor={communityEventsPage.nextCursor}
        communitySeries={communitySeries}
      />
    </div>
  );
}
