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
          <p className="text-sm font-semibold text-foreground mb-2">{day}</p>
          <div className="space-y-2">
            {services.slice(0, SHOW_PER_DAY).map((service) => (
              <Card key={service.id} className="rounded-2xl border-0 bg-white shadow-card">
                <CardContent className="px-4 py-2 flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{service.type}</p>
                  <p className="text-sm font-semibold text-primary">{service.time}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <button className="flex items-center gap-1 text-sm font-semibold text-primary">
        See More <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
