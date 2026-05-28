import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateSeriesForm } from "./_components/create-series-form";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import { sessionToClaims } from "@/domains/roles/lib/session";
import { seriesPolicy } from "@/domains/roles/policies/series";

export default async function CreateSeriesPage() {
  const session = await auth();
  if (!session) redirect("/");

  const claims = sessionToClaims(session);
  const churchMemberships = session.user.churchMemberships ?? [];
  const eligibleIds = session.user.isPlatformAdmin
    ? churchMemberships.map((m) => m.churchId)
    : churchMemberships
        .filter((m) => claims && seriesPolicy.canCreate(claims, m.churchId))
        .map((m) => m.churchId);

  if (!session.user.isPlatformAdmin && eligibleIds.length === 0) redirect("/");

  const churches = await getChurchesByIds(eligibleIds);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Create Series" />
      <div className="px-4 pb-6">
        <div className="shadow-card rounded-2xl bg-white p-5">
          <CreateSeriesForm churches={churches} />
        </div>
      </div>
    </div>
  );
}
