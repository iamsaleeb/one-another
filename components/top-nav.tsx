import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-primary px-4">
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
    </header>
  );
}
