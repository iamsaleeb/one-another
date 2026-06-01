"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow, format } from "date-fns";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { reviewRequestAction, revokeAccessAction } from "../actions/requests";
import { RequestTimeline } from "./request-timeline";
import type { ResolvedRequest } from "../lib/types";

interface PendingRequest {
  id: string;
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: PendingRequest[];
  resolvedRequests: ResolvedRequest[];
  resourceType: ResourceType;
  resourceId: string;
}

const ROLE_LABELS: Record<string, string> = {
  EVENT_EDITOR: "Event Editor",
  SERIES_SESSION_CREATOR: "Session Creator",
  EVENT_CREATOR: "Event Creator",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  DENIED: "bg-red-100 text-red-700 hover:bg-red-100",
  CANCELLED: "bg-gray-100 text-gray-600 hover:bg-gray-100",
  REVOKED: "bg-gray-100 text-gray-600 hover:bg-gray-100",
};

const STATUS_LABEL: Record<string, string> = {
  DENIED: "Denied",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
};

export function ApproverRequestsDrawer({
  open,
  onOpenChange,
  requests,
  resolvedRequests,
}: Props) {
  const approvedMembers = resolvedRequests.filter(
    (r) => r.status === "APPROVED"
  );
  const historyItems = resolvedRequests.filter((r) => r.status !== "APPROVED");

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Manage helpers</DrawerTitle>
          <DrawerDescription>
            Review requests, manage access, and view history
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4">
          <Tabs defaultValue="requests">
            <TabsList className="w-full">
              <TabsTrigger value="requests" className="flex-1">
                Requests
                {requests.length > 0 && (
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {requests.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="members" className="flex-1">
                Members
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="requests">
              <div className="max-h-[50vh] overflow-y-auto py-2">
                {requests.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No pending requests
                  </p>
                ) : (
                  requests.map((req, i) => (
                    <div key={req.id}>
                      {i > 0 && <Separator className="my-4" />}
                      <RequestRow request={req} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="members">
              <div className="max-h-[50vh] overflow-y-auto py-2">
                {approvedMembers.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No approved members
                  </p>
                ) : (
                  approvedMembers.map((req, i) => (
                    <div key={req.id}>
                      {i > 0 && <Separator className="my-4" />}
                      <MemberRow request={req} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="max-h-[50vh] overflow-y-auto py-2">
                {historyItems.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No history
                  </p>
                ) : (
                  historyItems.map((req, i) => (
                    <div key={req.id}>
                      {i > 0 && <Separator className="my-4" />}
                      <HistoryRow request={req} />
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function RequestRow({ request }: { request: PendingRequest }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";
  const roleLabel = ROLE_LABELS[request.requestedRole] ?? request.requestedRole;

  function handleReview(decision: "APPROVED" | "DENIED") {
    setError(null);
    startTransition(async () => {
      const result = await reviewRequestAction({
        requestId: request.id,
        decision,
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex gap-3 py-1">
      <Avatar className="size-12 shrink-0">
        {request.requester.image && (
          <AvatarImage
            src={request.requester.image}
            alt={request.requester.name ?? ""}
          />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {request.requester.name ?? "Unknown"}
          </p>
          <span
            className="text-muted-foreground shrink-0 text-xs"
            suppressHydrationWarning
          >
            {formatDistanceToNow(request.createdAt, { addSuffix: true })}
          </span>
        </div>

        <Badge variant="secondary" className="w-fit text-xs">
          {roleLabel}
        </Badge>

        {request.message && (
          <div className="bg-muted/50 rounded-lg px-3 py-2">
            <p className="text-muted-foreground text-sm italic">
              {request.message}
            </p>
          </div>
        )}

        {error && <p className="text-destructive text-xs">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1"
            onClick={() => handleReview("APPROVED")}
            disabled={isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={() => handleReview("DENIED")}
            disabled={isPending}
          >
            Deny
          </Button>
        </div>
      </div>
    </div>
  );
}

function MemberRow({ request }: { request: ResolvedRequest }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";
  const roleLabel = ROLE_LABELS[request.requestedRole] ?? request.requestedRole;

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAccessAction({ requestId: request.id });
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex gap-3 py-1">
      <Avatar className="size-10 shrink-0">
        {request.requester.image && (
          <AvatarImage
            src={request.requester.image}
            alt={request.requester.name ?? ""}
          />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {request.requester.name ?? "Unknown"}
          </p>
          <Badge variant="secondary" className="w-fit text-xs">
            {roleLabel}
          </Badge>
          {request.reviewedAt && (
            <span className="text-muted-foreground text-xs">
              Approved {format(request.reviewedAt, "d MMM yyyy")}
            </span>
          )}
        </div>

        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant="outline"
            className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRevoke}
            disabled={isPending}
          >
            {isPending ? "Revoking…" : "Revoke"}
          </Button>
          {error && (
            <p className="text-destructive text-right text-xs">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryRow({ request }: { request: ResolvedRequest }) {
  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";
  const roleLabel = ROLE_LABELS[request.requestedRole] ?? request.requestedRole;

  return (
    <div className="flex gap-3 py-1">
      <Avatar className="size-10 shrink-0">
        {request.requester.image && (
          <AvatarImage
            src={request.requester.image}
            alt={request.requester.name ?? ""}
          />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-medium">
            {request.requester.name ?? "Unknown"}
          </p>
          <Badge
            className={
              STATUS_BADGE_CLASS[request.status] ??
              "bg-gray-100 text-gray-600 hover:bg-gray-100"
            }
          >
            {STATUS_LABEL[request.status] ?? request.status}
          </Badge>
        </div>

        <Badge variant="secondary" className="w-fit text-xs">
          {roleLabel}
        </Badge>

        <RequestTimeline
          status={request.status as ApprovalStatus}
          createdAt={request.createdAt}
          reviewedAt={request.reviewedAt}
        />
      </div>
    </div>
  );
}
