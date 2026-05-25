import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { CreateSeriesForm } from "./_components/create-series-form";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByIds } from "@/domains/churches/actions/data";

export default async function CreateSeriesPage() {
  const session = await auth();

  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    redirect("/");
  }

  const managedIds = [
    ...(session.user.organiserChurchIds ?? []),
    ...(session.user.adminChurchIds ?? []),
  ];
  const churches = await getChurchesByIds(managedIds);

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
