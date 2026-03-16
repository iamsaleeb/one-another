import Link from "next/link";
import { Church } from "lucide-react";
import { getChurches } from "@/lib/actions/data";

const gradients = [
  "from-rose-800 via-rose-600 to-orange-400",
  "from-amber-900 via-amber-700 to-yellow-500",
  "from-sky-800 via-sky-600 to-blue-400",
  "from-emerald-800 via-emerald-600 to-teal-400",
  "from-violet-800 via-violet-600 to-purple-400",
  "from-stone-700 via-stone-500 to-stone-400",
];

export default async function ChurchesPage() {
  const churches = await getChurches();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 pt-5 pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Churches</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {churches.length} churches in your area
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 px-4 py-2 pb-24">
        {churches.map((church, i) => (
          <Link key={church.id} href={`/churches/${church.id}`}>
            <div className="relative aspect-square rounded-2xl overflow-hidden shadow-md">
              {/* Gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}`} />

              {/* Subtle icon watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Church className="w-24 h-24 text-white" />
              </div>

              {/* Bottom gradient overlay + name */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pt-10 pb-3 px-3">
                <p className="text-white text-sm font-bold leading-snug drop-shadow">
                  {church.name}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
