import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getEventById } from "@/domains/events/actions/data";
import { getAbility, eventSubject } from "@/domains/roles";
import { getAccessRequestById } from "@/domains/access-requests";
import { ROLE_LABELS } from "@/domains/access-requests/lib/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestTimeline } from "@/domains/access-requests/components/request-timeline";
import { RequestDetailActions } from "@/domains/access-requests/components/request-detail-actions";

interface Props {
  params: Promise<{ id: string; requestId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { requestId } = await params;
  const request = await getAccessRequestById(requestId);
  return {
    title: request?.requester.name
      ? `Request — ${request.requester.name}`
      : "Request detail",
  };
}

export default async function EventHelperDetailPage({ params }: Props) {
  const [{ id, requestId }, ability] = await Promise.all([
    params,
    getAbility(),
  ]);

  const [event, request] = await Promise.all([
    getEventById(id),
    getAccessRequestById(requestId),
  ]);

  if (!event || !request) notFound();
  if (request.eventId !== id) notFound();

  if (!ability.can("manage_staff", eventSubject(event))) notFound();

  const backHref = `/events/${id}/helpers`;
  const initials = request.requester.name?.slice(0, 2).toUpperCase() ?? "??";
  const roleLabel = ROLE_LABELS[request.requestedRole] ?? request.requestedRole;

  return (
    <div className="bg-background min-h-screen">
      <div className="flex items-center gap-1 px-4 pt-4 pb-2">
        <Link
          href={backHref}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to helpers"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <h1 className="text-lg font-semibold">Request detail</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 pt-4">
        <div className="flex items-center gap-4">
          <Avatar className="size-16 shrink-0">
            {request.requester.image && (
              <AvatarImage
                src={request.requester.image}
                alt={request.requester.name ?? ""}
              />
            )}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            <p className="text-base font-semibold">
              {request.requester.name ?? "Unknown"}
            </p>
            <Badge variant="secondary" className="w-fit text-xs">
              {roleLabel}
            </Badge>
            <span
              className="text-muted-foreground text-xs"
              suppressHydrationWarning
            >
              {formatDistanceToNow(request.createdAt, { addSuffix: true })}
            </span>
          </div>
        </div>

        <RequestTimeline
          status={request.status}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
        />

        {request.message && (
          <>
            <Separator />
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-muted-foreground mb-1 text-xs">Message</p>
              <p className="text-sm italic">{request.message}</p>
            </div>
          </>
        )}

        <RequestDetailActions
          requestId={request.id}
          status={request.status}
          backHref={backHref}
        />
      </div>
    </div>
  );
}
