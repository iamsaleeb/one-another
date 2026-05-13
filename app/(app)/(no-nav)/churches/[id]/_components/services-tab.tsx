import { ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { getChurchById } from "@/lib/actions/data-churches";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;

interface ServicesTabProps {
  church: ChurchWithDetails;
}

export function ServicesTab({ church }: ServicesTabProps) {
  const servicesByDay = church.serviceTimes.reduce<
    Record<string, typeof church.serviceTimes>
  >((acc, service) => {
    if (!acc[service.day]) acc[service.day] = [];
    acc[service.day].push(service);
    return acc;
  }, {});

  const SHOW_PER_DAY = 2;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold">Service Schedule</h2>

      {Object.entries(servicesByDay).map(([day, services]) => (
        <div key={day}>
          <p className="text-foreground mb-2 text-sm font-semibold">{day}</p>
          <div className="space-y-2">
            {services.slice(0, SHOW_PER_DAY).map((service) => (
              <Card
                key={service.id}
                className="shadow-card rounded-2xl border-0 bg-white"
              >
                <CardContent className="flex items-center justify-between px-4 py-2">
                  <p className="text-foreground text-sm font-bold">
                    {service.type}
                  </p>
                  <p className="text-primary text-sm font-semibold">
                    {service.time}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <button className="text-primary flex items-center gap-1 text-sm font-semibold">
        See More <ChevronDown className="h-4 w-4" />
      </button>
    </div>
  );
}
