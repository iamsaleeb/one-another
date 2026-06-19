"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Church,
  CalendarDays,
  Wrench,
  ShieldCheck,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";

const publicTabs = [
  { label: "Home", href: "/", icon: Home },
  { label: "Churches", href: "/churches", icon: Church },
];

const authTabs = [
  { label: "My Events", href: "/my-events", icon: CalendarDays },
  { label: "Inbox", href: "/inbox", icon: Bell },
];

const organiserTab = { label: "Tools", href: "/organiser", icon: Wrench };
const adminTab = { label: "Admin", href: "/admin", icon: ShieldCheck };

interface BottomNavProps {
  isAuthenticated?: boolean;
  isOrganiser?: boolean;
  isAdmin?: boolean;
  unreadCount?: number;
}

export function BottomNav({
  isAuthenticated,
  isOrganiser,
  isAdmin,
  unreadCount = 0,
}: BottomNavProps) {
  const pathname = usePathname();

  const tabs = isAuthenticated
    ? isAdmin
      ? [...publicTabs, ...authTabs, organiserTab, adminTab]
      : isOrganiser
        ? [...publicTabs, ...authTabs, organiserTab]
        : [...publicTabs, ...authTabs]
    : publicTabs;

  return (
    <nav className="pb-safe fixed right-0 bottom-0 left-0 z-50 bg-white shadow-[0px_-2px_31px_0px_#0000001A]">
      <div className="flex h-16 items-center justify-around px-2">
        {tabs.map(({ label, href, icon: Icon }) => {
          const isActive = pathname === href;
          const showDot = href === "/inbox" && unreadCount > 0;
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
              <div className="relative">
                <Icon
                  className={cn(
                    "size-5 transition-transform",
                    isActive && "scale-110"
                  )}
                />
                {showDot && (
                  <span className="bg-destructive absolute -top-0.5 -right-0.5 size-2 rounded-full" />
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
