import Link from "next/link";
import Image from "next/image";
import { Church, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatLocality } from "@/lib/address";

interface ChurchCardProps {
  church: {
    id: string;
    name: string;
    photoUrl: string | null;
    address: { suburb: string | null; city: string } | null;
  };
  priority?: boolean;
  followButton?: React.ReactNode;
}

export function ChurchCard({
  church,
  priority = false,
  followButton,
}: ChurchCardProps) {
  const location = church.address ? formatLocality(church.address) : "";

  return (
    <Card className="shadow-card relative flex-row gap-3 rounded-2xl border-0 bg-white p-3">
      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl">
        {church.photoUrl ? (
          <Image
            src={church.photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="80px"
            priority={priority}
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8e+/+fwAI9AN2hc9PNgAAAABJRU5ErkJggg=="
          />
        ) : (
          <div className="from-primary/80 via-primary to-primary/60 absolute inset-0 flex items-center justify-center bg-gradient-to-br">
            <Church className="size-8 text-white/30" />
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        {/* Stretched link: the whole card opens the church, the follow button sits above it */}
        <Link
          href={`/churches/${church.id}`}
          className="line-clamp-2 text-sm leading-snug font-bold after:absolute after:inset-0 after:rounded-2xl"
        >
          {church.name}
        </Link>
        <div className="flex items-center justify-between gap-2">
          {location ? (
            <p className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{location}</span>
            </p>
          ) : (
            <span />
          )}
          {followButton && (
            <div className="relative z-10 shrink-0">{followButton}</div>
          )}
        </div>
      </div>
    </Card>
  );
}
