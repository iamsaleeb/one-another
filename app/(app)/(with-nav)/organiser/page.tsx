import { redirect } from "next/navigation";
import { getAbility, getSessionUserId, hasAnyGrant } from "@/domains/roles";
import { PageHeader } from "@/components/ui/page-header";
import { getEventsNotByCreatorPaged } from "@/domains/events/actions/data";
import { getManageableEventsPaged } from "@/domains/events/dal/manageable";
import { getSeriesNotByCreator } from "@/domains/series/actions/data";
import { getManageableSeries } from "@/domains/series/dal/manageable";
import { OrganiserTabs } from "./_components/organiser-tabs";

export default async function OrganiserPage() {
  const [userId, ability] = await Promise.all([
    getSessionUserId(),
    getAbility(),
  ]);
  if (!userId) redirect("/");

  // Organisers: anyone holding a Grant at any level (Church, Series, Event).
  if (!hasAnyGrant(ability)) redirect("/");

  const [myEventsPage, mySeries, communityEventsPage, communitySeries] =
    await Promise.all([
      getManageableEventsPaged(null, ability),
      getManageableSeries(ability),
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
