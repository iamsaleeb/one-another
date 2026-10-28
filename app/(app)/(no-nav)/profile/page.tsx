import { Card } from "@/components/ui/card";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { getProfileUser } from "@/domains/profile/actions/data";
import { loadGrants } from "@/domains/roles/lib/grants";
import { signOutAction } from "@/domains/auth/actions/auth";
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
  type LucideIcon,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { InfoField } from "@/components/info-field";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { RoleBadge, type RoleBadgeRole } from "./_components/role-badge";
import { version } from "@/package.json";
import { formatDateOnly } from "@/lib/datetime";

function SectionHeader({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <Item size="sm">
      <ItemMedia>
        <Icon className="text-primary size-3.5" aria-hidden="true" />
      </ItemMedia>
      <ItemContent>
        <ItemTitle className="font-semibold">{children}</ItemTitle>
      </ItemContent>
    </Item>
  );
}

function LinkItem({
  href,
  icon: Icon,
  className,
  children,
}: {
  href: string;
  icon: LucideIcon;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Item size="sm" className="rounded-none" asChild>
      <Link href={href}>
        <ItemMedia>
          <Icon
            className={cn("text-primary size-3.5", className)}
            aria-hidden="true"
          />
        </ItemMedia>
        <ItemContent>
          <ItemTitle className={className}>{children}</ItemTitle>
        </ItemContent>
        <ItemActions>
          <ChevronRight className="text-muted-foreground size-4" />
        </ItemActions>
      </Link>
    </Item>
  );
}

export const metadata: Metadata = {
  title: "Profile — One Another",
};

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  const [dbUser, grants] = user?.id
    ? await Promise.all([getProfileUser(user.id), loadGrants(user.id)])
    : [null, null];

  // Display only: the highest Church-level role the user holds.
  const memberships = grants?.church ?? [];
  let badgeRole: RoleBadgeRole | null = null;
  if (grants?.isPlatformAdmin) badgeRole = "PLATFORM_ADMIN";
  else if (memberships.some((m) => m.role === "CHURCH_ADMIN"))
    badgeRole = "CHURCH_ADMIN";
  else if (memberships.some((m) => m.role === "EVENT_MANAGER"))
    badgeRole = "EVENT_MANAGER";
  else if (memberships.some((m) => m.role === "EVENT_CREATOR"))
    badgeRole = "EVENT_CREATOR";

  return (
    <div className="bg-background">
      <div className="flex flex-col gap-4 px-4 pt-6 pb-28">
        {/* Profile header */}
        <Card className="flex-row items-center gap-4 p-5">
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
            {badgeRole && <RoleBadge role={badgeRole} />}
          </div>
        </Card>

        {/* Info card — only shown when supplementary details exist */}
        {(dbUser?.phone || dbUser?.dateOfBirth) && (
          <Card className="gap-0 overflow-hidden py-0">
            <ItemGroup>
              {dbUser.phone && (
                <InfoField
                  className="px-4 py-3"
                  icon={Phone}
                  label="Phone"
                  iconClassName="text-primary size-3.5"
                >
                  {dbUser.phone}
                </InfoField>
              )}
              {dbUser.phone && dbUser.dateOfBirth && <ItemSeparator />}
              {dbUser.dateOfBirth && (
                <InfoField
                  className="px-4 py-3"
                  icon={CalendarDays}
                  label="Date of birth"
                  iconClassName="text-primary size-3.5"
                >
                  {formatDateOnly(dbUser.dateOfBirth)}
                </InfoField>
              )}
            </ItemGroup>
          </Card>
        )}

        {/* Settings */}
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            <SectionHeader icon={Settings}>Settings</SectionHeader>
            <ItemSeparator />
            <LinkItem href="/profile/edit" icon={UserPen}>
              Edit Profile
            </LinkItem>
            <ItemSeparator />
            <LinkItem href="/profile/notifications" icon={Bell}>
              Notifications
            </LinkItem>
          </ItemGroup>
        </Card>

        {/* Legal */}
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            <SectionHeader icon={ScrollText}>Legal</SectionHeader>
            <ItemSeparator />
            <LinkItem href="/privacy" icon={Shield}>
              Privacy Policy
            </LinkItem>
            <ItemSeparator />
            <LinkItem href="/terms" icon={ScrollText}>
              Terms of Service
            </LinkItem>
            <ItemSeparator />
            <Item size="sm">
              <ItemContent>
                <ItemDescription className="text-xs">
                  Version{" "}
                  <span className="text-foreground font-medium">{version}</span>
                </ItemDescription>
              </ItemContent>
            </Item>
          </ItemGroup>
        </Card>

        {/* Account */}
        <Card className="gap-0 overflow-hidden py-0">
          <ItemGroup>
            <SectionHeader icon={UserCog}>Account</SectionHeader>
            <ItemSeparator />
            <form action={signOutAction}>
              <Item size="sm" className="w-full rounded-none" asChild>
                <button type="submit">
                  <ItemMedia>
                    <LogOut className="text-primary size-3.5" />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>Sign out</ItemTitle>
                  </ItemContent>
                </button>
              </Item>
            </form>
            <ItemSeparator />
            <LinkItem
              href="/profile/account"
              icon={UserX}
              className="text-destructive"
            >
              Delete Account
            </LinkItem>
          </ItemGroup>
        </Card>
      </div>
    </div>
  );
}
