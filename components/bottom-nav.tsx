"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Church, CalendarDays, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsDetailPage } from "@/lib/hooks/use-is-detail-page";

const baseTabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Churches", href: "/churches", icon: Church },
  { label: "My Events", href: "/my-events", icon: CalendarDays },
];

const organiserTab = { label: "Tools", href: "/organiser", icon: Wrench };

interface BottomNavProps {
  isOrganiser?: boolean;
}

export function BottomNav({ isOrganiser }: BottomNavProps) {
  const pathname = usePathname();
  const isDetailPage = useIsDetailPage();

  if (isDetailPage) return null;

  const tabs = isOrganiser ? [...baseTabs, organiserTab] : baseTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0px_-2px_31px_0px_#0000001A]">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "size-5 transition-transform",
                  isActive && "scale-110"
                )}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
