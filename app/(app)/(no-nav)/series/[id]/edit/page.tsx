import { notFound, redirect } from "next/navigation";
import { getSeriesById } from "@/domains/series/actions/data";
import {
  getAbility,
  getChurchTargets,
  getSessionUserId,
  seriesSubject,
} from "@/domains/roles";
import { PageHeader } from "@/components/ui/page-header";
import { EditSeriesForm } from "./_components/edit-series-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const [series, userId, ability] = await Promise.all([
    getSeriesById(id),
    getSessionUserId(),
    getAbility(),
  ]);

  if (!userId) redirect("/");
  if (!series) notFound();
  if (!ability.can("update", seriesSubject(series))) notFound();

  // Church dropdown: Churches the Series could be moved to, plus its own.
  const targets = await getChurchTargets("create_series", ability);
  const churches = targets.some((c) => c.id === series.churchId)
    ? targets
    : [series.church, ...targets];

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Series" />
      <div className="px-4 pb-6">
        <div className="shadow-card rounded-2xl bg-white p-5">
          <EditSeriesForm
            series={{
              id: series.id,
              name: series.name,
              description: series.description,
              cadence: series.cadence,
              location: series.location,
              host: series.host,
              tag: series.tag,
              churchId: series.churchId,
              photoUrl: series.photoUrl,
            }}
            churches={churches}
          />
        </div>
      </div>
    </div>
  );
}
