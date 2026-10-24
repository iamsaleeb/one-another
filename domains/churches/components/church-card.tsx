import Link from "next/link";
import Image from "next/image";
import { Church, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ChurchCardProps {
  church: {
    id: string;
    name: string;
    address: string | null;
    photoUrl: string | null;
  };
  priority?: boolean;
  followButton?: React.ReactNode;
}

export function ChurchCard({
  church,
  priority = false,
  followButton,
}: ChurchCardProps) {
  return (
    <div className="relative">
      <Link href={`/churches/${church.id}`}>
        <Card className="shadow-card flex-row gap-0 overflow-hidden rounded-2xl border-0 bg-white py-0">
          <div className="relative w-28 shrink-0 self-stretch">
            {church.photoUrl ? (
              <Image
                src={church.photoUrl}
                alt=""
                fill
                className="object-cover"
                sizes="112px"
                priority={priority}
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mO8e+/+fwAI9AN2hc9PNgAAAABJRU5ErkJggg=="
              />
            ) : (
              <div className="from-primary/80 via-primary to-primary/60 absolute inset-0 flex items-center justify-center bg-gradient-to-br">
                <Church className="size-10 text-white/30" />
              </div>
            )}
          </div>
          <div className="flex min-h-28 min-w-0 flex-1 flex-col gap-1 p-4 pb-14">
            <p className="line-clamp-2 text-base leading-snug font-bold">
              {church.name}
            </p>
            {church.address && (
              <p className="text-muted-foreground flex items-start gap-1 text-sm">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                <span className="line-clamp-2">{church.address}</span>
              </p>
            )}
          </div>
        </Card>
      </Link>
      {followButton && (
        <div className="absolute right-3 bottom-3 z-10">{followButton}</div>
      )}
    </div>
  );
}
