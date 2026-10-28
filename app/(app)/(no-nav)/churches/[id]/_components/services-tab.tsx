import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { getChurchById } from "@/domains/churches/actions/data";

type ChurchWithDetails = NonNullable<Awaited<ReturnType<typeof getChurchById>>>;
type ServiceTime = ChurchWithDetails["serviceTimes"][number];

interface ServicesTabProps {
  church: ChurchWithDetails;
}

const SHOW_PER_DAY = 2;

function ServiceCard({ service }: { service: ServiceTime }) {
  return (
    <Card className="py-0">
      <CardContent className="flex items-center justify-between px-4 py-4">
        <p className="text-foreground text-sm font-bold">{service.type}</p>
        <p className="text-primary text-sm font-semibold">{service.time}</p>
      </CardContent>
    </Card>
  );
}

export function ServicesTab({ church }: ServicesTabProps) {
  const servicesByDay = church.serviceTimes.reduce<
    Record<string, typeof church.serviceTimes>
  >((acc, service) => {
    if (!acc[service.day]) acc[service.day] = [];
    acc[service.day].push(service);
    return acc;
  }, {});

  const hasMore = Object.values(servicesByDay).some(
    (services) => services.length > SHOW_PER_DAY
  );

  return (
    <Collapsible className="space-y-5">
      <h2 className="text-lg font-bold">Service Schedule</h2>

      {Object.entries(servicesByDay).map(([day, services]) => (
        <div key={day}>
          <p className="text-foreground mb-2 text-sm font-semibold">{day}</p>
          <div className="space-y-2">
            {services.slice(0, SHOW_PER_DAY).map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
            <CollapsibleContent className="space-y-2">
              {services.slice(SHOW_PER_DAY).map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </CollapsibleContent>
          </div>
        </div>
      ))}

      {hasMore && (
        <CollapsibleTrigger asChild>
          <Button variant="link" className="group px-0">
            <span className="group-data-[state=open]:hidden">See more</span>
            <span className="hidden group-data-[state=open]:inline">
              See less
            </span>
            <ChevronDown className="transition-transform group-data-[state=open]:rotate-180" />
          </Button>
        </CollapsibleTrigger>
      )}
    </Collapsible>
  );
}
