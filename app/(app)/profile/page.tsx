import type { Metadata } from "next";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut, Mail, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Profile — One Another",
};

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="bg-background min-h-screen">
      {/* Hero banner */}
      <div className="relative w-full h-40 bg-gradient-to-br from-primary/80 via-primary to-primary/60">
        <div className="absolute bottom-0 right-0 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute top-4 right-10 w-16 h-16 rounded-full bg-white/10" />
      </div>

      <div className="px-4">
        {/* Avatar overlapping banner */}
        <div className="-mt-12 mb-4">
          <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-primary text-primary-foreground shadow-md text-2xl font-bold">
            {getInitials(user?.name, user?.email)}
          </div>
        </div>

        {/* Name & email */}
        <div className="mb-6">
          <h1 className="text-xl font-bold">{user?.name ?? "User"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Info card */}
        <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] divide-y divide-border overflow-hidden mb-6">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{user?.name ?? "—"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
              <Mail className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium">{user?.email ?? "—"}</p>
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
