import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getAdminChurches } from "@/lib/actions/data";
import { AdminChurchCard } from "./_components/admin-church-card";

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const churchesWithOrganisers = await getAdminChurches(session.user.id);

  return (
    <div className="flex flex-col">
      <PageHeader title="Church Admin" />
      <div className="px-4 pb-6 flex flex-col gap-4">
        {churchesWithOrganisers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
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
