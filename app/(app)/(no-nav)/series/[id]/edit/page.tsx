import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getSeriesById } from "@/domains/series/actions/data";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { seriesPolicy } from "@/domains/roles/policies/series";
import { getSeriesStaffForUser } from "@/domains/roles/dal/series-staff";
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

  const claims = sessionToClaims(session);
  const canUpdateFromChurch =
    session.user.isPlatformAdmin ||
    (!!claims && seriesPolicy.canUpdate(claims, series.churchId));

  if (!canUpdateFromChurch) {
    const staff = await getSeriesStaffForUser(session.user.id, series.id);
    if (staff?.role !== "SERIES_MANAGER") notFound();
  }

  const churchMemberships = session.user.churchMemberships ?? [];
  const eligibleIds = session.user.isPlatformAdmin
    ? churchMemberships.map((m) => m.churchId)
    : churchMemberships
        .filter((m) => claims && seriesPolicy.canUpdate(claims, m.churchId))
        .map((m) => m.churchId);

  let churches = await getChurchesByIds(eligibleIds);
  if (!churches.some((c) => c.id === series.churchId)) {
    // Series staff or platform admin with no church memberships
    if (series.church) {
      churches = [series.church];
    } else {
      notFound();
    }
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
