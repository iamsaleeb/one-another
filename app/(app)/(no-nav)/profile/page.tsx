import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getProfileUser } from "@/lib/actions/data-user";
import { signOutAction } from "@/lib/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  LogOut,
  Phone,
  ScrollText,
  Settings,
  Shield,
  UserCog,
  UserPen,
  UserX,
} from "lucide-react";
import { getInitials } from "@/lib/utils";
import { InfoField } from "@/components/ui/info-field";
import { RoleBadge } from "./_components/role-badge";
import { version } from "@/package.json";
import { formatDateOnly } from "@/lib/datetime";

export const metadata: Metadata = {
  title: "Profile — One Another",
};

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  const dbUser = user?.id ? await getProfileUser(user.id) : null;

  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Profile header */}
        <div className="shadow-card flex items-center gap-4 rounded-2xl bg-white p-5">
          <Avatar className="size-16 shrink-0 rounded-xl text-xl">
            <AvatarImage src={user?.image ?? ""} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground rounded-xl font-bold">
              {getInitials(user?.name, user?.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold">
              {user?.name ?? "User"}
            </h1>
            <p className="text-muted-foreground truncate text-sm">
              {user?.email}
            </p>
            {(user?.role === "ORGANISER" || user?.role === "ADMIN") && (
              <RoleBadge role={user.role as "ORGANISER" | "ADMIN"} />
            )}
          </div>
        </div>

        {/* Info card — only shown when supplementary details exist */}
        {(dbUser?.phone || dbUser?.dateOfBirth) && (
          <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
            {dbUser.phone && (
              <div className="px-4 py-3">
                <InfoField
                  icon={Phone}
                  label="Phone"
                  iconClassName="w-3.5 h-3.5 text-primary"
                >
                  {dbUser.phone}
                </InfoField>
              </div>
            )}
            {dbUser.dateOfBirth && (
              <div className="px-4 py-3">
                <InfoField
                  icon={CalendarDays}
                  label="Date of birth"
                  iconClassName="w-3.5 h-3.5 text-primary"
                >
                  {formatDateOnly(dbUser.dateOfBirth)}
                </InfoField>
              </div>
            )}
          </div>
        )}

        {/* Settings */}
        <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <Settings className="text-primary h-3.5 w-3.5" />
            <span className="text-sm font-semibold">Settings</span>
          </div>
          <Link href="/profile/edit">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <UserPen className="text-primary h-3.5 w-3.5" />
                <span className="text-sm font-medium">Edit Profile</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </Link>
          <Link href="/profile/notifications">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Bell className="text-primary h-3.5 w-3.5" />
                <span className="text-sm font-medium">Notifications</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </Link>
        </div>

        {/* Legal */}
        <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <ScrollText className="text-primary h-3.5 w-3.5" />
            <span className="text-sm font-semibold">Legal</span>
          </div>
          <Link href="/privacy">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Shield className="text-primary h-3.5 w-3.5" />
                <span className="text-sm font-medium">Privacy Policy</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </Link>
          <Link href="/terms">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <ScrollText className="text-primary h-3.5 w-3.5" />
                <span className="text-sm font-medium">Terms of Service</span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </Link>
          <div className="px-4 py-3">
            <span className="text-muted-foreground text-xs">
              Version{" "}
              <span className="text-foreground font-medium">{version}</span>
            </span>
          </div>
        </div>

        {/* Account */}
        <div className="shadow-card divide-border divide-y overflow-hidden rounded-2xl bg-white">
          <div className="flex items-center gap-2 px-4 py-3">
            <UserCog className="text-primary h-3.5 w-3.5" aria-hidden="true" />
            <span className="text-sm font-semibold">Account</span>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-4 py-3 text-left"
            >
              <LogOut className="text-primary h-3.5 w-3.5" />
              <span className="text-sm font-medium">Sign out</span>
            </button>
          </form>
          <Link href="/profile/account">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <UserX
                  className="text-destructive h-3.5 w-3.5"
                  aria-hidden="true"
                />
                <span className="text-destructive text-sm font-medium">
                  Delete Account
                </span>
              </div>
              <ChevronRight className="text-muted-foreground h-4 w-4" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
