import { Card } from "@/components/ui/card";
import { redirect } from "next/navigation";
import { CreateSeriesForm } from "./_components/create-series-form";
import { PageHeader } from "@/components/ui/page-header";
import { getChurchTargets, getSessionUserId } from "@/domains/roles";

export default async function CreateSeriesPage() {
  if (!(await getSessionUserId())) redirect("/");

  const churches = await getChurchTargets("create_series");
  if (churches.length === 0) redirect("/");

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Create Series" />
      <div className="px-4 pb-6">
        <Card className="gap-0 p-5">
          <CreateSeriesForm churches={churches} />
        </Card>
      </div>
    </div>
  );
}
