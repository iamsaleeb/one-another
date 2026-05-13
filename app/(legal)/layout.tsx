import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-background min-h-svh">
      <header className="bg-background/95 pt-safe sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center px-4">
          <Link
            href="/login"
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Link>
          <span className="text-primary ml-4 font-semibold">1Another</span>
        </div>
      </header>
      <main className="pb-safe mx-auto max-w-2xl px-4 py-8">{children}</main>
    </div>
  );
}
