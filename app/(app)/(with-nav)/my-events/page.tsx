import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
} from "@/lib/actions/data-events";
import { getUserFollowedSeries } from "@/lib/actions/data-series";
import { MyEventsTabs } from "./_components/my-events-tabs";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [upcomingPage, pastPage, followedSeries] = await Promise.all([
    getUserAttendedEventsPaged(userId, null),
    getUserAttendedPastEventsPaged(userId, null),
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
        pastItems={pastPage.items}
        pastCursor={pastPage.nextCursor}
        followedSeries={followedSeries}
      />
    </div>
  );
}
