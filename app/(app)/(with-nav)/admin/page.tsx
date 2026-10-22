import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesWithOrganisers } from "@/domains/churches/actions/data";
import { getChurchTargets, getSessionUserId } from "@/domains/roles";
import { AdminChurchCard } from "./_components/admin-church-card";

export default async function AdminPage() {
  if (!(await getSessionUserId())) redirect("/");

  // Anyone who may manage the members of at least one Church.
  const manageable = await getChurchTargets("manage_members");
  if (manageable.length === 0) redirect("/");

  const churchesWithOrganisers = await getChurchesWithOrganisers(
    manageable.map((c) => c.id)
  );

  return (
    <div className="flex flex-col">
      <PageHeader title="Church Admin" />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {churchesWithOrganisers.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center text-sm">
            You have not been assigned as admin for any church.
          </p>
        ) : (
          churchesWithOrganisers.map((church) => (
            <AdminChurchCard key={church.id} church={church} />
          ))
        )}
      </div>
    </div>
  );
}
