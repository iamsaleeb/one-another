"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelRequestAction } from "@/domains/approvals/actions/requests";
import { RequestTimeline } from "./request-timeline";
import { RequestForm } from "./request-form";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  myRequest: MyRequest | null;
  onClose?: () => void;
}

const SHOW_FORM_STATUSES: ApprovalStatus[] = ["DENIED", "CANCELLED", "REVOKED"];

export function MyRequestView({
  resourceType,
  resourceId,
  resourceName,
  myRequest,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const status = myRequest?.status ?? null;
  const showForm = !status || SHOW_FORM_STATUSES.includes(status);

  function handleCancel() {
    if (!myRequest) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRequestAction({ requestId: myRequest.id });
      if (result.error) { setError(result.error); return; }
      router.refresh();
      onClose?.();
    });
  }

  if (showForm) {
    return (
      <RequestForm
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <RequestTimeline
        status={myRequest!.status}
        createdAt={myRequest!.createdAt}
        reviewedAt={myRequest!.reviewedAt}
      />

      {myRequest!.message && (
        <>
          <Separator />
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-muted-foreground mb-1 text-xs">Your message</p>
            <p className="text-sm italic">{myRequest!.message}</p>
          </div>
        </>
      )}

      {status === "APPROVED" && (
        <div className="rounded-lg bg-green-50 p-3">
          <p className="text-sm font-medium text-green-700">You now have access</p>
        </div>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      {status === "PENDING" && (
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleCancel}
          disabled={isPending}
        >
          {isPending ? "Cancelling…" : "Cancel request"}
        </Button>
      )}
    </div>
  );
}
