import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getSeriesById } from "@/domains/series/actions/data";
import { getActor } from "@/domains/roles/lib/session";
import { Capabilities } from "@/domains/roles/lib/capabilities";
import { getApprovalRequestById } from "@/domains/approvals";
import { ROLE_LABELS } from "@/domains/approvals/lib/labels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RequestTimeline } from "@/domains/approvals/components/request-timeline";
import { RequestDetailActions } from "@/domains/approvals/components/request-detail-actions";

interface Props {
  params: Promise<{ id: string; requestId: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { requestId } = await params;
  const request = await getApprovalRequestById(requestId);
  return {
    title: request?.requester.name
      ? `Request — ${request.requester.name}`
      : "Request detail",
  };
}

export default async function SeriesHelperDetailPage({ params }: Props) {
  const [{ id, requestId }, actor] = await Promise.all([params, getActor()]);

  const [series, request] = await Promise.all([
    getSeriesById(id),
    getApprovalRequestById(requestId),
  ]);

  if (!series || !request) notFound();
  if (request.resourceType !== "SERIES" || request.resourceId !== id)
    notFound();

  const access = await actor.loadContext({
    churchId: series.churchId,
    seriesId: id,
  });
  if (!access.can(Capabilities.SERIES_UPDATE)) notFound();

  const backHref = `/series/${id}/helpers`;
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
