import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { events } from "@/lib/data/events";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Home</h1>
      </header>

      {/* Body */}
      <div className="flex flex-col gap-6 px-4 py-2">
        <section className="flex flex-col gap-3">
          {events.map((item) => (
            <Link key={item.id} href={`/events/${item.id}`}>
              <Card className="rounded-2xl border-0 bg-white py-0 shadow-[4px_4px_10px_0px_#E8E8E866]">
                <CardContent className="flex flex-col gap-1.5 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-primary uppercase tracking-wide">{item.datetime}</p>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">{item.tag}</span>
                  </div>
                  <p className="text-lg font-bold leading-snug">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.location}</p>
                  <p className="text-sm text-muted-foreground">{item.host}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}
