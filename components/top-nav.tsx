"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useIsDetailPage } from "@/lib/hooks/use-is-detail-page";
import { SearchBar } from "@/components/search-bar";
import type { WhenFilter, TypeFilter } from "@/types/search";

interface TopNavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface TopNavProps {
  user?: TopNavUser;
}

function TopNavInner({ user }: TopNavProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isDetailPage = useIsDetailPage();

  return (
    <header className="sticky top-0 z-50 bg-primary pt-safe">
      <div className="flex h-14 items-center justify-between px-4">
        {isDetailPage ? (
          <button
            onClick={() => router.back()}
            className="flex items-center text-primary-foreground"
            aria-label="Go back"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        ) : (
          <Link href="/" className="text-xl font-bold tracking-tight text-primary-foreground">
            1Another
          </Link>
        )}
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/80" asChild>
            <span>
              <Avatar className="size-8">
                <AvatarImage src={user?.image ?? ""} alt={user?.name ?? "Profile"} />
                <AvatarFallback className="text-xs font-semibold bg-primary-foreground/20 text-primary-foreground">
                  {getInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
            </span>
          </Button>
        </Link>
      </div>

      {!isDetailPage && (
        <div className="bg-white px-4 py-2.5 border-b border-border">
          <SearchBar
            initialQuery={searchParams.get("q") ?? ""}
            initialWhen={(searchParams.get("when") as WhenFilter) ?? undefined}
            initialCategory={searchParams.get("category") ?? ""}
            initialType={(searchParams.get("type") as TypeFilter) ?? "all"}
          />
        </div>
      )}
    </header>
  );
}

export function TopNav({ user }: TopNavProps) {
  return (
    <Suspense>
      <TopNavInner user={user} />
    </Suspense>
  );
}
