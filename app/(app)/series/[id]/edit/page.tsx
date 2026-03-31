import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getSeriesById, getChurchesByManager } from "@/lib/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { EditSeriesForm } from "./_components/edit-series-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const [series, session] = await Promise.all([getSeriesById(id), auth()]);

  if (session?.user?.role !== UserRole.ORGANISER && session?.user?.role !== UserRole.ADMIN) redirect("/");
  if (!series) notFound();

  const churches = await getChurchesByManager(session.user.id);
  if (!churches.some((c) => c.id === series.churchId)) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Series" />
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-white shadow-card p-5">
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
            }}
            churches={churches}
          />
        </div>
      </div>
    </div>
  );
}
