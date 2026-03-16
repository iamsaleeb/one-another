"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(urlQuery);

  // Keep input in sync with URL (e.g. back/forward navigation)
  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  if (pathname.startsWith("/events/") || pathname.startsWith("/churches/")) return null;

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
      {/* Brand row */}
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold tracking-tight text-primary-foreground">
          1Another
        </Link>
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/80" asChild>
            <span>
              <Avatar className="size-8">
                <AvatarImage src="" alt="My Profile" />
                <AvatarFallback className="text-xs font-semibold bg-primary-foreground/20 text-primary-foreground">
                  ME
                </AvatarFallback>
              </Avatar>
            </span>
          </Button>
        </Link>
      </div>

      {/* Search row */}
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
    </header>
  );
}
