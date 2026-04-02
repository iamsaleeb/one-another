import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Bell, ChevronRight, Info, LogOut, Mail, Tag, User } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { InfoField } from "@/components/ui/info-field";
import { RoleBadge } from "./_components/role-badge";
import { version } from "@/package.json";

export const metadata: Metadata = {
  title: "Profile — One Another",
};

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Profile header card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-primary text-primary-foreground text-xl font-bold shrink-0">
            {getInitials(user?.name, user?.email)}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{user?.name ?? "User"}</h1>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {(user?.role === "ORGANISER" || user?.role === "ADMIN") && (
              <RoleBadge role={user.role as "ORGANISER" | "ADMIN"} />
            )}
          </div>
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3">
            <InfoField icon={User} label="Name" iconClassName="w-3.5 h-3.5 text-primary">
              {user?.name ?? "—"}
            </InfoField>
          </div>
          <div className="px-4 py-3">
            <InfoField icon={Mail} label="Email" iconClassName="w-3.5 h-3.5 text-primary">
              {user?.email ?? "—"}
            </InfoField>
          </div>
        </div>

        {/* Notification settings */}
        <Link href="/profile/notifications">
          <div className="rounded-2xl bg-white shadow-card overflow-hidden">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">Notification Settings</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        </Link>

        {/* About */}
        <div className="rounded-2xl bg-white shadow-card overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2 border-b border-border">
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold">About</span>
          </div>
          <div className="px-4 py-3 flex flex-col gap-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              One Another is a church event discovery and management platform. Browse events from
              local churches, RSVP, follow churches, and manage recurring event series — available
              as a web app and on Android &amp; iOS.
            </p>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">
                Version <span className="font-medium text-foreground">{version}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sign out */}
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outline"
            className="w-full h-11 rounded-xl font-semibold gap-2 text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
