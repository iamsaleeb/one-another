import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur pt-safe">
        <div className="flex h-14 items-center px-4 max-w-2xl mx-auto">
          <Link
            href="/login"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Link>
          <span className="ml-4 font-semibold text-primary">1Another</span>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 pb-safe">{children}</main>
    </div>
  );
}
