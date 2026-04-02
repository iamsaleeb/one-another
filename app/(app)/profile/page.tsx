import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, CalendarDays, ChevronRight, Info, KeyRound, LogOut, Phone, ScrollText, Settings, Shield, Tag, UserPen } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { InfoField } from "@/components/ui/info-field";
import { RoleBadge } from "./_components/role-badge";
import { DeleteAccountButton } from "./_components/delete-account-button";
import { version } from "@/package.json";
import { format } from "date-fns";

export const metadata: Metadata = {
  title: "Profile — One Another",
};

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  const dbUser = user?.id
    ? await prisma.user.findUnique({
        where: { id: user.id },
        select: { phone: true, dateOfBirth: true },
      })
    : null;

  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Profile header card */}
        <div className="rounded-2xl bg-white shadow-card p-5 flex items-center gap-4">
          <Avatar className="size-16 text-xl rounded-xl shrink-0">
            <AvatarImage src={user?.image ?? ""} className="object-cover" />
            <AvatarFallback className="rounded-xl bg-primary text-primary-foreground font-bold">
              {getInitials(user?.name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="text-lg font-bold truncate">{user?.name ?? "User"}</h1>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            {(user?.role === "ORGANISER" || user?.role === "ADMIN") && (
              <RoleBadge role={user.role as "ORGANISER" | "ADMIN"} />
            )}
          </div>
        </div>

        {/* Info card — only shown when supplementary details exist */}
        {(dbUser?.phone || dbUser?.dateOfBirth) && (
          <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
            {dbUser.phone && (
              <div className="px-4 py-3">
                <InfoField icon={Phone} label="Phone" iconClassName="w-3.5 h-3.5 text-primary">
                  {dbUser.phone}
                </InfoField>
              </div>
            )}
            {dbUser.dateOfBirth && (
              <div className="px-4 py-3">
                <InfoField icon={CalendarDays} label="Date of birth" iconClassName="w-3.5 h-3.5 text-primary">
                  {format(dbUser.dateOfBirth, "d MMMM yyyy")}
                </InfoField>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2">
            <Settings className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold">Settings</span>
          </div>
          {/* Edit Profile — placeholder */}
          <div className="px-4 py-3 flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <UserPen className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium">Edit Profile</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Soon</span>
          </div>
          {/* Change Password — placeholder */}
          <div className="px-4 py-3 flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-medium">Change Password</span>
            </div>
            <span className="text-xs text-muted-foreground font-medium">Soon</span>
          </div>
          {/* Notifications */}
          <Link href="/profile/notifications">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">Notifications</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        </div>

        {/* Legal */}
        <div className="rounded-2xl bg-white shadow-card divide-y divide-border overflow-hidden">
          <div className="px-4 py-3 flex items-center gap-2">
            <ScrollText className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold">Legal</span>
          </div>
          <Link href="/privacy">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
          <Link href="/terms">
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ScrollText className="w-3.5 h-3.5 text-primary" />
                <span className="text-sm font-medium">Terms of Service</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>
          </Link>
        </div>

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

        {/* Danger zone */}
        <DeleteAccountButton />
      </div>
    </div>
  );
}
