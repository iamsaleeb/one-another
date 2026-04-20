import type { CampAgendaItem } from "@/lib/validations/event";

interface CampAgendaProps {
  agenda: CampAgendaItem[];
  startDate: string;
  endDate: string;
}

function formatCampDate(isoDate: string): string {
  // Parse at noon UTC to avoid day-shift issues
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatAgendaTime(time?: string): string | null {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

export function CampAgenda({ agenda, endDate }: CampAgendaProps) {
  if (agenda.length === 0 && !endDate) return null;

  // Group items by date
  const grouped = new Map<string, CampAgendaItem[]>();
  const sorted = [...agenda].sort((a, b) => a.date.localeCompare(b.date));
  for (const item of sorted) {
    const existing = grouped.get(item.date) ?? [];
    existing.push(item);
    grouped.set(item.date, existing);
  }

  if (grouped.size === 0) return null;

  return (
    <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
      <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground text-center">
        | Schedule |
      </p>

      <div className="flex flex-col gap-5">
        {Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">
              {formatCampDate(date)}
            </p>
            <div className="flex flex-col gap-2 pl-1 border-l-2 border-primary/20">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 pl-3">
                  <div className="flex items-baseline gap-2">
                    {item.time && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatAgendaTime(item.time)}
                      </span>
                    )}
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
