import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ExplorePage() {
  const categories = [
    { label: "Worship", emoji: "🎵" },
    { label: "Prayer", emoji: "🙏" },
    { label: "Youth", emoji: "⚡" },
    { label: "Outreach", emoji: "🤝" },
    { label: "Bible Study", emoji: "📖" },
    { label: "Missions", emoji: "🌍" },
  ];

  const featured = [
    { name: "Grace Community Church", location: "Austin, TX", distance: "0.4 mi" },
    { name: "New Life Fellowship", location: "Austin, TX", distance: "1.2 mi" },
    { name: "Harvest Church", location: "Austin, TX", distance: "2.1 mi" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Explore</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Discover churches and events near you
        </p>
      </header>

      <div className="flex flex-col gap-6 px-4 py-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search churches, events…"
            className="pl-9 rounded-xl bg-muted/50 border-0"
          />
        </div>

        {/* Categories */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Browse by Category</h2>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <Card
                key={cat.label}
                className="rounded-2xl border-0 bg-muted/40 shadow-sm cursor-pointer hover:bg-muted/70 transition-colors"
              >
                <CardContent className="flex flex-col items-center justify-center gap-1.5 p-4">
                  <span className="text-2xl">{cat.emoji}</span>
                  <p className="text-xs font-medium text-center">{cat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Nearby */}
        <section className="flex flex-col gap-3">
          <h2 className="text-base font-semibold">Nearby Churches</h2>
          {featured.map((church) => (
            <Card
              key={church.name}
              className="rounded-2xl border-0 bg-muted/40 shadow-sm"
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="text-sm font-medium">{church.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3" />
                    {church.location}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {church.distance}
                </span>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}
