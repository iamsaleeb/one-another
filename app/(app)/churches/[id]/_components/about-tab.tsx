import { Calendar, Globe, MapPin, Phone, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { InfoField } from "@/components/ui/info-field";
import type { getChurchById } from "@/lib/actions/data";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface AboutTabProps {
  church: ChurchWithDetails;
}

const muted = "w-4 h-4 text-muted-foreground shrink-0 mt-0.5";

export function AboutTab({ church }: AboutTabProps) {
  return (
    <div className="space-y-5">
      {/* Description */}
      <section>
        <h2 className="text-lg font-bold mb-2">About</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{church.description}</p>
      </section>

      <Separator />

      {/* Details */}
      <section>
        <h2 className="text-lg font-bold mb-3">Details</h2>
        <Card className="rounded-2xl border-0 bg-white shadow-card">
          <CardContent className="px-4 py-3 space-y-4">
            <InfoField icon={Users} label="Followers" iconClassName={muted}>
              {church._count.followers.toLocaleString()}
            </InfoField>
            {church.founded && (
              <InfoField icon={Calendar} label="Founded" iconClassName={muted}>
                {church.founded}
              </InfoField>
            )}
            {church.address && (
              <InfoField icon={MapPin} label="Address" iconClassName={muted}>
                {church.address}
              </InfoField>
            )}
            {church.phone && (
              <InfoField icon={Phone} label="Phone" iconClassName={muted}>
                {church.phone}
              </InfoField>
            )}
            {church.website && (
              <InfoField icon={Globe} label="Website" iconClassName={muted}>
                <a
                  href={`https://${church.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {church.website}
                </a>
              </InfoField>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
