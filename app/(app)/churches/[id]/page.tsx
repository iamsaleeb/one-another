import { notFound } from "next/navigation";
import { Globe, MapPin, Share2, Bell } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getChurchById } from "@/lib/actions/data-churches";
import { auth } from "@/auth";
import { ChurchTabs } from "./_components/church-tabs";
import { FollowButton } from "./_components/follow-button";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);
  return { title: church ? `${church.name} — One Another` : "Church Not Found" };
}

export default async function ChurchDetailPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const church = await getChurchById(id, session?.user?.id ?? undefined);

  if (!church) notFound();

  const isFollowing = church.followers.length > 0;

  return (
    <div className="bg-muted/20 pb-8">
      {/* Church Info Card */}
      <div className="px-4 pt-5 pb-3">
        <Card className="rounded-2xl border-0 shadow-none overflow-hidden bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 pt-6 pb-5 px-5">
            {/* Circular Avatar */}
            <Avatar className="size-24 ring-4 ring-primary/10">
              <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                {church.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            {/* Church Name */}
            <h1 className="text-xl font-bold text-primary text-center leading-snug px-2">
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
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-border hover:border-primary transition-colors">
                    <Globe className="w-5 h-5 text-foreground" />
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
                  <div className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-border hover:border-primary transition-colors">
                    <MapPin className="w-5 h-5 text-foreground" />
                  </div>
                </a>
              )}
              <div className="flex items-center justify-center w-11 h-11 rounded-full border-2 border-border">
                <Share2 className="w-5 h-5 text-foreground" />
              </div>
            </div>

            {/* Follow Alert */}
            <Alert className="border-primary/20 bg-primary/5 text-primary">
              <Bell />
              <AlertDescription className="text-primary/80">
                Following this church will notify you about upcoming events and services.
              </AlertDescription>
            </Alert>

            {/* Follow Button */}
            <FollowButton
              churchId={church.id}
              isFollowing={isFollowing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Tabbed content */}
      <ChurchTabs church={church} />
    </div>
  );
}
