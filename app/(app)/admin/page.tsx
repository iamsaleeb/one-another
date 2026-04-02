import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { prisma } from "@/lib/db";
import { AdminChurchCard } from "./_components/admin-church-card";

export default async function AdminPage() {
  const session = await auth();

  if (session?.user?.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const assignments = await prisma.churchAdmin.findMany({
    where: { userId: session.user.id },
    select: {
      church: {
        select: {
          id: true,
          name: true,
          organisers: {
            select: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { user: { name: "asc" } },
          },
        },
      },
    },
    orderBy: { church: { name: "asc" } },
  });
  const churchesWithOrganisers = assignments.map((a) => ({
    id: a.church.id,
    name: a.church.name,
    organisers: a.church.organisers.map((o) => o.user),
  }));

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
