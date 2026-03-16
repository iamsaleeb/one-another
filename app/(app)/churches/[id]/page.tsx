import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  Phone,
  Globe,
  Clock,
  Users,
  CalendarDays,
  Church,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChurchById } from "@/lib/actions/data";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);
  return { title: church ? `${church.name} — One Another` : "Church Not Found" };
}

export default async function ChurchDetailPage({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);

  if (!church) notFound();

  const upcomingEvents = church.events;

  return (
    <div className="bg-background">

        {/* Hero banner */}
        <div className="relative w-full h-48 bg-gradient-to-br from-primary/80 via-primary to-primary/60">
          {/* Decorative circles */}
          <div className="absolute bottom-0 right-0 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute top-6 right-12 w-20 h-20 rounded-full bg-white/10" />
        </div>

        {/* Avatar overlapping banner */}
        <div className="relative px-4">
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-md border border-border">
              <Church className="w-9 h-9 text-primary" />
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Button variant="outline" size="sm" className="h-8 rounded-full px-4 text-xs font-semibold">
                Contact
              </Button>
              <Button size="sm" className="h-8 rounded-full px-4 text-xs font-semibold">
                Follow
              </Button>
            </div>
          </div>

          {/* Church name & denomination */}
          <div className="flex flex-col gap-1.5 mb-4">
            <h1 className="text-xl font-bold leading-snug">{church.name}</h1>
            <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {church.denomination}
            </span>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-0 rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] mb-5 divide-x divide-border overflow-hidden">
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <p className="text-base font-bold">{church.followers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <p className="text-base font-bold">{church.members.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <p className="text-base font-bold">{church.totalEvents}</p>
              <p className="text-xs text-muted-foreground">Events</p>
            </div>
            <div className="flex flex-1 flex-col items-center gap-0.5 py-3">
              <p className="text-base font-bold">{church.founded}</p>
              <p className="text-xs text-muted-foreground">Founded</p>
            </div>
          </div>

          {/* About */}
          <section className="mb-5">
            <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-2">
              About
            </h2>
            <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] p-4">
              <p className="text-sm text-foreground leading-relaxed">
                {church.description}
              </p>
            </div>
          </section>

          {/* Service Times */}
          <section className="mb-5">
            <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-2">
              Service Times
            </h2>
            <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] divide-y divide-border overflow-hidden">
              {church.serviceTimes.map((service) => (
                <div key={service.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold">{service.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {service.day} · {service.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Contact Info */}
          <section className="mb-5">
            <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground mb-2">
              Contact
            </h2>
            <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] divide-y divide-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground">{church.address}</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-foreground">{church.phone}</p>
              </div>
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 shrink-0">
                  <Globe className="w-3.5 h-3.5 text-primary" />
                </div>
                <p className="text-sm text-primary font-medium">{church.website}</p>
              </div>
            </div>
          </section>

          {/* Upcoming Events */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">
                Events
              </h2>
              <span className="text-xs text-muted-foreground">
                {upcomingEvents.length} upcoming
              </span>
            </div>

            {upcomingEvents.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-[4px_4px_10px_0px_#E8E8E866] p-6 flex flex-col items-center gap-2">
                <CalendarDays className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No upcoming events</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcomingEvents.map((event) => (
                  <Link key={event.id} href={`/events/${event.id}`}>
                    <Card className="rounded-2xl border-0 bg-white py-0 shadow-[4px_4px_10px_0px_#E8E8E866]">
                      <CardContent className="flex flex-col gap-1.5 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wide">
                            {event.datetime}
                          </p>
                          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary whitespace-nowrap">
                            {event.tag}
                          </span>
                        </div>
                        <p className="text-base font-bold leading-snug">{event.title}</p>
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                        <p className="text-sm text-muted-foreground">{event.host}</p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 z-10 px-4 py-4 bg-white shadow-[0px_-2px_31px_0px_#0000001A] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4 shrink-0" />
          <span>
            <span className="font-semibold text-foreground">
              {church.followers.toLocaleString()}
            </span>{" "}
            followers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-11 px-5 rounded-xl font-semibold flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Contact
          </Button>
          <Button className="h-11 px-6 rounded-xl font-semibold">
            Follow
          </Button>
        </div>
      </div>
    </div>
  );
}
