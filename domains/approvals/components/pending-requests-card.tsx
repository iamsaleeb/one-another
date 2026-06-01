// domains/approvals/components/pending-requests-card.tsx
"use client";

import { useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ResourceType } from "@prisma/client";
import { reviewRequestAction } from "../actions/requests";

interface PendingRequest {
  id: string;
  message: string | null;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  requests: PendingRequest[];
  resourceType: ResourceType;
  resourceId: string;
}

export function PendingRequestsCard({ requests }: Props) {
  if (requests.length === 0) return null;

  return (
    <Card className="shadow-card rounded-2xl border-0 bg-white">
      <CardHeader className="flex flex-row items-center gap-2 pb-3">
        <CardTitle className="text-base font-semibold">Help requests</CardTitle>
        <Badge variant="secondary">{requests.length}</Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {requests.map((req) => (
          <RequestRow key={req.id} request={req} />
        ))}
      </CardContent>
    </Card>
  );
}

function RequestRow({ request }: { request: PendingRequest }) {
  const [isPending, startTransition] = useTransition();
  const initials = request.requester.name
    ? request.requester.name.slice(0, 2).toUpperCase()
    : "??";

  function handleReview(decision: "APPROVED" | "DENIED") {
    startTransition(() =>
      reviewRequestAction({ requestId: request.id, decision }).then(() => {})
    );
  }

  return (
    <div className="flex items-start gap-3">
      <Avatar className="size-9 shrink-0">
        {request.requester.image && (
          <AvatarImage
            src={request.requester.image}
            alt={request.requester.name ?? ""}
          />
        )}
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-1.5">
        <p className="text-sm leading-none font-medium">
          {request.requester.name ?? "Unknown"}
        </p>
        {request.message && (
          <p className="text-muted-foreground text-sm">{request.message}</p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={() => handleReview("APPROVED")}
            disabled={isPending}
          >
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
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
