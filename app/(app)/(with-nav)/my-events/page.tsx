import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { getUserAttendedEventsPaged } from "@/domains/events/actions/data";
import { getUserFollowedSeries } from "@/domains/series/actions/data";
import { MyEventsTabs } from "./_components/my-events-tabs";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [upcomingPage, followedSeries] = await Promise.all([
    getUserAttendedEventsPaged(userId, null),
    getUserFollowedSeries(userId),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="My Events"
        description={`${upcomingPage.items.length}${upcomingPage.nextCursor ? "+" : ""} upcoming`}
      />
      <MyEventsTabs
        upcomingItems={upcomingPage.items}
        upcomingCursor={upcomingPage.nextCursor}
        followedSeries={followedSeries}
      />
    </div>
  );
}
