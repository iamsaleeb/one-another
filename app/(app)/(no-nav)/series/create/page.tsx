import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateSeriesForm } from "./_components/create-series-form";
import { PageHeader } from "@/components/ui/page-header";
import { getChurches, getChurchesByIds } from "@/domains/churches/actions/data";
import { getActor } from "@/domains/roles/lib/session";
import { Capabilities } from "@/domains/roles/lib/capabilities";

export default async function CreateSeriesPage() {
  const [session, actor] = await Promise.all([auth(), getActor()]);
  if (!session) redirect("/");

  const churchMemberships = session.user.churchMemberships ?? [];
  const eligibleIds = (
    await Promise.all(
      churchMemberships.map(async (m) => {
        const allowed = await actor.can(Capabilities.SERIES_CREATE, {
          churchId: m.churchId,
        });
        return allowed ? m.churchId : null;
      })
    )
  ).filter((id): id is string => id !== null);

  if (!session.user.isPlatformAdmin && eligibleIds.length === 0) redirect("/");

  const churches = session.user.isPlatformAdmin
    ? await getChurches()
    : await getChurchesByIds(eligibleIds);

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
