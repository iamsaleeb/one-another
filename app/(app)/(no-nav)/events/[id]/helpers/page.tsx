import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { auth } from "@/auth";
import { getEventById } from "@/domains/events/actions/data";
import { sessionToActor } from "@/domains/roles/lib/session";
import { can } from "@/domains/roles/lib/can";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import {
  getPendingRequestsForResource,
  getAllRequestsForResource,
} from "@/domains/approvals";
import { HelpersTabs } from "@/domains/approvals/components/helpers-tabs";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const event = await getEventById(id);
  return { title: event ? `Helpers — ${event.title}` : "Helpers" };
}

export default async function EventHelpersPage({ params }: Props) {
  const [{ id }, session] = await Promise.all([params, auth()]);
  const event = await getEventById(id);
  if (!event) notFound();

  const actor = sessionToActor(session);
  const canManageStaff = actor
    ? await can(actor, Capabilities.EVENT_MANAGE_STAFF, {
        churchId: event.churchId ?? "",
        eventId: id,
      })
    : false;
  if (!canManageStaff) notFound();

  const [pendingRequests, resolvedRequests] = await Promise.all([
    getPendingRequestsForResource("EVENT", id),
    getAllRequestsForResource("EVENT", id),
  ]);

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={`/events/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to event"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">{event.title}</h1>
      </div>
      <HelpersTabs
        pendingRequests={pendingRequests}
        resolvedRequests={resolvedRequests}
        basePath={`/events/${id}/helpers`}
      />
    </div>
  );
}
