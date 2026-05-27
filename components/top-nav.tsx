"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { getInitials } from "@/lib/utils";
import { useShowBackButton } from "@/hooks/use-show-back-button";
import { SearchBar } from "@/components/search-bar";
import type { WhenFilter, TypeFilter } from "@/lib/types/search";

interface TopNavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface TopNavProps {
  user?: TopNavUser;
}

function SearchBarWithParams() {
  const searchParams = useSearchParams();
  return (
    <SearchBar
      initialQuery={searchParams.get("q") ?? ""}
      initialWhen={(searchParams.get("when") as WhenFilter) ?? undefined}
      initialCategory={searchParams.get("category") ?? ""}
      initialType={(searchParams.get("type") as TypeFilter) ?? "all"}
    />
  );
}

export function TopNav({ user }: TopNavProps) {
  const router = useRouter();
  const showBackButton = useShowBackButton();

  return (
    <header className="bg-primary pt-safe sticky top-0 z-50">
      <div className="flex h-14 items-center justify-between px-4">
        {showBackButton ? (
          <button
            onClick={() => router.back()}
            className="text-primary-foreground flex items-center"
            aria-label="Go back"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : (
          <Link
            href="/"
            className="text-primary-foreground text-xl font-bold tracking-tight"
          >
            1Another
          </Link>
        )}
        {user ? (
          <Link href="/profile">
            <Button
              variant="ghost"
              size="icon"
              className="hover:bg-primary/80 rounded-full"
              asChild
            >
              <span>
                <Avatar className="size-8">
                  <AvatarImage
                    src={user.image ?? ""}
                    alt={user.name ?? "Profile"}
                  />
                  <AvatarFallback className="bg-primary-foreground text-primary text-xs font-semibold">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
              </span>
            </Button>
          </Link>
        ) : (
          <Button size="sm" asChild>
            <Link href="/login">Sign in</Link>
          </Button>
        )}
      </div>

      {!showBackButton && (
        <div className="border-border border-b bg-white px-4 py-2.5">
          <Suspense fallback={<SearchBar />}>
            <SearchBarWithParams />
          </Suspense>
        </div>
      )}
    </header>
  );
}
