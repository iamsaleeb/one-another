import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Phone, Globe, ChevronRight } from "lucide-react";

const churches = [
  {
    name: "Grace Community Church",
    address: "123 Main St, Austin, TX",
    phone: "(512) 555-0101",
    website: "gracecommunity.org",
    tag: "Non-denominational",
  },
  {
    name: "New Life Fellowship",
    address: "456 Elm Ave, Austin, TX",
    phone: "(512) 555-0182",
    website: "newlifefellowship.org",
    tag: "Baptist",
  },
  {
    name: "Harvest Church",
    address: "789 Oak Blvd, Austin, TX",
    phone: "(512) 555-0147",
    website: "harvestchurch.com",
    tag: "Pentecostal",
  },
  {
    name: "City Light Church",
    address: "321 Pine Rd, Austin, TX",
    phone: "(512) 555-0193",
    website: "citylightchurch.com",
    tag: "Presbyterian",
  },
];

export default function ChurchesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Churches</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {churches.length} churches in your area
        </p>
      </header>

      <div className="flex flex-col gap-3 px-4 py-2">
        {churches.map((church) => (
          <Card
            key={church.name}
            className="rounded-2xl border-0 bg-muted/40 shadow-sm"
          >
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between">
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold">{church.name}</p>
                  <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {church.tag}
                  </span>
                </div>
                <Button variant="ghost" size="icon" className="size-7 -mr-1 -mt-1">
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-2">
                  <MapPin className="size-3 shrink-0" />
                  {church.address}
                </span>
                <span className="flex items-center gap-2">
                  <Phone className="size-3 shrink-0" />
                  {church.phone}
                </span>
                <span className="flex items-center gap-2">
                  <Globe className="size-3 shrink-0" />
                  {church.website}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
