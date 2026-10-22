import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getSeriesById } from "@/domains/series/actions/data";
import { getAbility, seriesSubject } from "@/domains/roles";
import {
  getPendingRequestsForResource,
  getResolvedRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const series = await getSeriesById(id);
  return { title: series ? `Helpers — ${series.name}` : "Helpers" };
}

export default async function SeriesHelpersPage({ params }: Props) {
  const [{ id }, ability] = await Promise.all([params, getAbility()]);
  const series = await getSeriesById(id);
  if (!series) notFound();

  if (!ability.can("update", seriesSubject(series))) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("SERIES", id),
    getResolvedRequestsForResource("SERIES", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/series/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to series"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{series.name}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/series/${id}/helpers`}
      />
    </div>
  );
}
