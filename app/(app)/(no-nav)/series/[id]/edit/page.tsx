import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { getSeriesById } from "@/lib/actions/data-series";
import { getChurchesByIds } from "@/domains/churches/actions/data";
import { PageHeader } from "@/components/ui/page-header";
import { EditSeriesForm } from "./_components/edit-series-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: Props) {
  const { id } = await params;
  const [series, session] = await Promise.all([getSeriesById(id), auth()]);

  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  )
    redirect("/");
  if (!series) notFound();

  const managedIds = [
    ...(session.user.organiserChurchIds ?? []),
    ...(session.user.adminChurchIds ?? []),
  ];
  const churches = await getChurchesByIds(managedIds);
  if (!churches.some((c) => c.id === series.churchId)) notFound();

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
