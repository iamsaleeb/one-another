import { notFound } from "next/navigation";
import { Globe, MapPin, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  getChurchById,
  getMyChurchFollow,
} from "@/domains/churches/actions/data";
import { auth } from "@/auth";
import { getActor } from "@/domains/roles/lib/session";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getMyRequestForResource,
  getPendingRequestsForResource,
  ApprovalMenuTrigger,
} from "@/domains/approvals";
import { ChurchTabs } from "./_components/church-tabs";
import { FollowButton } from "./_components/follow-button";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);
  return {
    title: church ? `${church.name} — One Another` : "Church Not Found",
  };
}

export default async function ChurchDetailPage({ params }: Props) {
  const [{ id }, actor, session] = await Promise.all([
    params,
    getActor(),
    auth(),
  ]);

  const userId = actor.isAuthenticated ? actor.id : null;

  const [church, myFollow] = await Promise.all([
    getChurchById(id),
    userId ? getMyChurchFollow(id, userId) : Promise.resolve(null),
  ]);

  if (!church) notFound();

  const isFollowing = myFollow !== null;

  const access = await actor.loadContext({ churchId: id });
  const canManageMembers = access.can(Capabilities.CHURCH_MANAGE_MEMBERS);
  const canCreateEvent = access.can(Capabilities.EVENT_CREATE);

  const [myApprovalRequest, pendingApprovalRequests] = await Promise.all([
    userId
      ? getMyRequestForResource("CHURCH", id, userId)
      : Promise.resolve(null),
    canManageMembers
      ? getPendingRequestsForResource("CHURCH", id)
      : Promise.resolve([]),
  ]);

  return (
    <div className="bg-muted/20 pb-8">
      {/* Church Info Card */}
      <div className="px-4 pt-5 pb-3">
        <Card className="bg-primary/5 overflow-hidden rounded-2xl border-0">
          <CardContent className="flex flex-col items-center gap-4 px-5 pt-6 pb-5">
            {/* Circular Avatar */}
            <Avatar className="ring-primary/10 size-24 ring-4">
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {church.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Church Name */}
            <h1 className="text-primary px-2 text-center text-xl leading-snug font-bold">
              {church.name}
            </h1>

            {/* Icon Link Buttons */}
            <div className="flex items-center gap-5">
              {church.website && (
                <a
                  href={`https://${church.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Website"
                >
                  <div className="border-border hover:border-primary flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors">
                    <Globe className="text-foreground h-5 w-5" />
                  </div>
                </a>
              )}
              {church.address && (
                <a
                  href={`https://maps.google.com?q=${encodeURIComponent(church.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Location"
                >
                  <div className="border-border hover:border-primary flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors">
                    <MapPin className="text-foreground h-5 w-5" />
                  </div>
                </a>
              )}
            </div>

            {/* Follow Alert */}
            <Alert className="border-primary/20 bg-primary/5 text-primary">
              <Bell />
              <AlertDescription className="text-primary/80">
                Following this church will notify you about upcoming events and
                services.
              </AlertDescription>
            </Alert>

            {/* Follow Button */}
            <FollowButton
              churchId={church.id}
              isFollowing={isFollowing}
              isAuthenticated={!!userId}
              loginUrl={`/login?callbackUrl=/churches/${id}&intent=follow&label=${encodeURIComponent(church.name)}`}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end px-4 py-2">
        <ApprovalMenuTrigger
          resourceType="CHURCH"
          resourceId={id}
          resourceName={church.name}
          isAuthenticated={!!userId}
          hasContributorAccess={canCreateEvent}
          myRequest={myApprovalRequest ?? null}
          pendingCount={pendingApprovalRequests.length}
          isApprover={canManageMembers}
        />
      </div>

      {/* Tabbed content */}
      <ChurchTabs church={church} isAuthenticated={!!session?.user} />
    </div>
  );
}
