import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { CreateEventForm } from "./_components/create-event-form";
import { UserRole } from "@prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchesByOrganiser } from "@/lib/actions/data";

interface Props {
  searchParams: Promise<{ seriesId?: string }>;
}

export default async function CreateEventPage({ searchParams }: Props) {
  const session = await auth();

  if (session?.user?.role !== UserRole.ORGANISER) {
    redirect("/");
  }

  const { seriesId } = await searchParams;

  const [churches, series] = await Promise.all([
    getChurchesByOrganiser(session.user.id),
    seriesId
      ? prisma.series.findUnique({ where: { id: seriesId }, select: { id: true, name: true, church: { select: { id: true, name: true } } } })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title={series ? "Add Session" : "Create Event"} />
      <div className="px-4 pb-6">
        <div className="rounded-2xl bg-white shadow-card p-5">
          <CreateEventForm
            churches={churches}
            series={series ? { id: series.id, name: series.name, churchId: series.church.id, churchName: series.church.name } : undefined}
          />
        </div>
      </div>
    </div>
  );
}
