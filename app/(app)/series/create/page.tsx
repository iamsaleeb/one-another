import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { CreateSeriesForm } from "./_components/create-series-form";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByManager } from "@/lib/actions/data-churches";

export default async function CreateSeriesPage() {
  const session = await auth();

  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) {
    redirect("/");
  }

  const churches = await getChurchesByManager(session.user.id);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Create Series" />
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-white shadow-card p-5">
          <CreateSeriesForm churches={churches} />
        </div>
      </div>
    </div>
  );
}
