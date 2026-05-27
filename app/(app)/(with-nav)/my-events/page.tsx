import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import {
  getUserAttendedEventsPaged,
  getUserAttendedPastEventsPaged,
  getMySavedEventsPaged,
} from "@/domains/events/actions/data";
import { getUserFollowedSeries } from "@/domains/series/actions/data";
import { MyEventsTabs } from "./_components/my-events-tabs";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [upcomingPage, pastPage, followedSeries, savedPage] = await Promise.all(
    [
      getUserAttendedEventsPaged(userId, null),
      getUserAttendedPastEventsPaged(userId, null),
      getUserFollowedSeries(userId),
      getMySavedEventsPaged(userId, null),
    ]
  );

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
        savedItems={savedPage.items}
        savedCursor={savedPage.nextCursor}
      />
    </div>
  );
}
