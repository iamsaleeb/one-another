import Link from "next/link";
import { Church } from "lucide-react";
import { getChurches } from "@/lib/actions/data-churches";
import { PageHeader } from "@/components/ui/page-header";

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
    <div className="flex flex-col">
      <PageHeader
        title="Churches"
        description={`${churches.length} churches in your area`}
      />

      <div className="grid grid-cols-4 gap-3 px-4 py-2 pb-24">
        {churches.map((church, i) => (
          <Link key={church.id} href={`/churches/${church.id}`}>
            <div className="relative aspect-[2/4] overflow-hidden rounded-lg shadow-md">
              {/* Gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${gradients[i % gradients.length]}`}
              />

              {/* Subtle icon watermark */}
              <div className="absolute inset-0 flex items-center justify-center opacity-10">
                <Church className="h-24 w-24 text-white" />
              </div>

              {/* Bottom gradient overlay + name */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pt-10 pb-3">
                <p className="text-sm leading-snug font-bold text-white drop-shadow">
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
