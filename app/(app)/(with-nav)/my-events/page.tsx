import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PageHeader } from "@/components/ui/page-header";
import { getUserAttendedEvents, getUserAttendedPastEvents } from "@/lib/actions/data-events";
import { getUserFollowedSeries } from "@/lib/actions/data-series";
import { MyEventsTabs } from "./_components/my-events-tabs";

export default async function MyEventsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  const [upcomingEvents, pastEvents, followedSeries] = await Promise.all([
    getUserAttendedEvents(userId),
    getUserAttendedPastEvents(userId),
    getUserFollowedSeries(userId),
  ]);

  return (
    <div className="flex flex-col">
      <PageHeader title="My Events" description={`${upcomingEvents.length} upcoming`} />
      <MyEventsTabs
        upcomingEvents={upcomingEvents}
        pastEvents={pastEvents}
        followedSeries={followedSeries}
      />
    </div>
  );
}
