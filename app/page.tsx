import { Card, CardContent } from "@/components/ui/card";
import { Bell, Heart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-5 pb-4">
        <div>
          <p className="text-sm text-muted-foreground">Good morning 👋</p>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
        </div>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="size-5" />
          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />
        </Button>
      </header>

      {/* Body */}
      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Featured card */}
        <Card className="overflow-hidden rounded-2xl border-0 bg-primary text-primary-foreground shadow-md">
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="text-xs font-medium uppercase tracking-widest opacity-75">
              Featured Event
            </p>
            <h2 className="text-xl font-bold leading-snug">
              Sunday Worship Service
            </h2>
            <p className="text-sm opacity-80">
              Join us this Sunday at 10:00 AM for an uplifting time of worship
              and community.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-1 w-fit rounded-full"
            >
              Learn more
            </Button>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="rounded-2xl border-0 bg-muted/50 shadow-sm">
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                <Users className="size-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">24</p>
              <p className="text-xs text-muted-foreground">Churches nearby</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 bg-muted/50 shadow-sm">
            <CardContent className="flex flex-col items-start gap-2 p-4">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                <Heart className="size-4 text-primary" />
              </div>
              <p className="text-2xl font-bold">8</p>
              <p className="text-xs text-muted-foreground">Upcoming events</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Recent Activity</h2>
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
