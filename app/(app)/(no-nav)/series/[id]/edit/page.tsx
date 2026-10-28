import { Card } from "@/components/ui/card";
import { notFound, redirect } from "next/navigation";
import { getSeriesById } from "@/domains/series/actions/data";
import { getAbility, getSessionUserId, seriesSubject } from "@/domains/roles";
import { PageHeader } from "@/components/page-header";
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

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Series" />
      <div className="px-4 pb-6">
        <Card className="gap-0 p-5">
          <EditSeriesForm
            series={{
              id: series.id,
              name: series.name,
              description: series.description,
              cadence: series.cadence,
              location: series.location,
              host: series.host,
              tag: series.tag,
              photoUrl: series.photoUrl,
            }}
            church={series.church}
          />
        </Card>
      </div>
    </div>
  );
}
