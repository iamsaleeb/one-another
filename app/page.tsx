import { Card, CardContent } from "@/components/ui/card";
import { Bell, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          {[
            { title: "Prayer Group", subtitle: "Wednesday · 7:00 PM", tag: "Today" },
            { title: "Youth Bible Study", subtitle: "Friday · 6:30 PM", tag: "Fri" },
            { title: "Community Outreach", subtitle: "Saturday · 9:00 AM", tag: "Sat" },
          ].map((item) => (
            <Card key={item.title} className="rounded-2xl border-0 bg-muted/40 shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                  {item.tag}
                </span>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
