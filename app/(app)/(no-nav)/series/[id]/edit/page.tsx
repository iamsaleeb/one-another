import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSeriesById } from "@/domains/series/actions/data";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { PageHeader } from "@/components/ui/page-header";
import { EditSeriesForm } from "./_components/edit-series-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const [series, session] = await Promise.all([getSeriesById(id), auth()]);

  if (!session) redirect("/");
  if (!series) notFound();

  const actor = sessionToActor(session);
  const canAccess =
    !!actor &&
    (await can(actor, Capabilities.SERIES_UPDATE, {
      churchId: series.churchId,
      seriesId: series.id,
    }));
  if (!canAccess) notFound();

  // UI: church dropdown — filter JWT memberships to roles that have SERIES_UPDATE
  // (CHURCH_ADMIN and EVENT_MANAGER). Slightly stale is acceptable for UI only;
  // the actual auth decision above uses the DB via can().
  const churchMemberships = session.user.churchMemberships ?? [];
  const editableChurchIds = churchMemberships
    .filter((m) => m.role === "CHURCH_ADMIN" || m.role === "EVENT_MANAGER")
    .map((m) => m.churchId);

  let churches = await getChurchesByIds(editableChurchIds);
  if (!churches.some((c) => c.id === series.churchId)) {
    if (series.church) churches = [series.church];
    else notFound();
  }

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
