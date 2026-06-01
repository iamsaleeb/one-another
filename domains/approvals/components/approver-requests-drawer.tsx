"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import type { ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { reviewRequestAction } from "../actions/requests";

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
  resourceType: ResourceType;
  resourceId: string;
}

const ROLE_LABELS: Record<string, string> = {
  EVENT_EDITOR: "Event Editor",
  SERIES_SESSION_CREATOR: "Session Creator",
  EVENT_CREATOR: "Event Creator",
};

export function ApproverRequestsDrawer({
  open,
  onOpenChange,
  requests,
}: Props) {
  const count = requests.length;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Help requests</DrawerTitle>
          <DrawerDescription>
            {count === 1 ? "1 person wants" : `${count} people want`} to help
            out
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex max-h-[60vh] flex-col overflow-y-auto px-4 pb-2">
          {requests.map((req, i) => (
            <div key={req.id}>
              {i > 0 && <Separator className="my-4" />}
              <RequestRow request={req} />
            </div>
          ))}
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
