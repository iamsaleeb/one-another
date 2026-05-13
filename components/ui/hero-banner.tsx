import Image from "next/image";
import { cn } from "@/lib/utils";

interface HeroBannerProps {
  size?: "sm" | "md";
  photoUrl?: string;
  className?: string;
}

export function HeroBanner({
  size = "md",
  photoUrl,
  className,
}: HeroBannerProps) {
  const isSm = size === "sm";
  return (
    <div
      className={cn(
        "shadow-card relative mx-4 mt-4 overflow-hidden rounded-2xl",
        !photoUrl &&
          "from-primary/80 via-primary to-primary/60 bg-gradient-to-br",
        isSm ? "h-40" : "h-52",
        className
      )}
    >
      {photoUrl ? (
        <>
          <Image
            src={photoUrl}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0 bg-black/20" />
        </>
      ) : (
        <>
          <div
            className={cn(
              "absolute right-0 bottom-0 rounded-full bg-white/10",
              isSm ? "h-32 w-32" : "h-40 w-40"
            )}
          />
          <div
            className={cn(
              "absolute rounded-full bg-white/10",
              isSm ? "top-4 right-10 h-16 w-16" : "top-6 right-12 h-20 w-20"
            )}
          />
        </>
      )}
    </div>
  );
}
