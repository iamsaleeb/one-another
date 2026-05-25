import type { CampAgendaItem } from "@/domains/events/validations/event";

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
    <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
      <p className="text-muted-foreground text-center text-sm font-bold tracking-widest uppercase">
        | Schedule |
      </p>

      <div className="flex flex-col gap-5">
        {Array.from(grouped.entries()).map(([date, items]) => (
          <div key={date} className="flex flex-col gap-2">
            <p className="text-primary text-xs font-semibold tracking-wide uppercase">
              {formatCampDate(date)}
            </p>
            <div className="border-primary/20 flex flex-col gap-2 border-l-2 pl-1">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-0.5 pl-3">
                  <div className="flex items-baseline gap-2">
                    {item.time && (
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatAgendaTime(item.time)}
                      </span>
                    )}
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  {item.description && (
                    <p className="text-muted-foreground text-xs leading-relaxed">
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
