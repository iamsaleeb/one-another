import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getChurchById } from "@/domains/churches/actions/data";
import { getAbility, churchSubject } from "@/domains/roles";
import {
  getPendingRequestsForResource,
  getResolvedRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const church = await getChurchById(id);
  return { title: church ? `Helpers — ${church.name}` : "Helpers" };
}

export default async function ChurchHelpersPage({ params }: Props) {
  const [{ id }, ability] = await Promise.all([params, getAbility()]);
  const church = await getChurchById(id);
  if (!church) notFound();

  if (!ability.can("manage_members", churchSubject({ id }))) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("CHURCH", id),
    getResolvedRequestsForResource("CHURCH", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/churches/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to church"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{church.name}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/churches/${id}/helpers`}
      />
    </div>
  );
}
