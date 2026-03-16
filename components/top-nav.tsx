"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams, useParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, ChevronLeft } from "lucide-react";

interface TopNavUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function getInitials(user?: TopNavUser): string {
  if (user?.name) {
    const parts = user.name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return user.name.slice(0, 2).toUpperCase();
  }
  if (user?.email) return user.email[0].toUpperCase();
  return "?";
}

interface TopNavProps {
  user?: TopNavUser;
}

function TopNavInner({ user }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const id = params?.id ?? null;
  const isEventDetail = pathname.startsWith("/events/") && id !== null;
  const isChurchDetail = pathname.startsWith("/churches/") && id !== null;
  const isDetailPage = isEventDetail || isChurchDetail;

  let detailTitle = "";
  let backHref = "/";
  if (isEventDetail) {
    detailTitle = "Event";
    backHref = "/";
  }
  if (isChurchDetail) {
    detailTitle = "Church";
    backHref = "/churches";
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/?q=${encodeURIComponent(q)}`);
    } else {
      router.push("/");
    }
  }

  function handleClear() {
    setQuery("");
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-50 bg-primary">
      <div className="flex h-14 items-center justify-between px-4">
        {isDetailPage ? (
          <button
            onClick={() => router.push(backHref)}
            className="flex items-center gap-1 text-primary-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-semibold max-w-[200px] truncate">{detailTitle}</span>
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
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
            </span>
          </Button>
        </Link>
      </div>

      {!isDetailPage && (
        <div className="bg-white px-4 py-2.5 border-b border-border">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search events…"
                className="pl-9 pr-9 rounded-full bg-muted/60 border-0 h-10 text-sm focus-visible:ring-0"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground shrink-0"
            >
              <Search className="size-4" />
            </button>
          </form>
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
