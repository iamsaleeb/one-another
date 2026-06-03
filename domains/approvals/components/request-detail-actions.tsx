"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { reviewRequestAction, revokeAccessAction } from "@/domains/approvals/actions/requests";

interface Props {
  requestId: string;
  status: ApprovalStatus;
  backHref: string;
}

export function RequestDetailActions({ requestId, status, backHref }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleReview(decision: "APPROVED" | "DENIED") {
    setError(null);
    startTransition(async () => {
      const result = await reviewRequestAction({ requestId, decision });
      if (result.error) { setError(result.error); return; }
      router.push(backHref);
    });
  }

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAccessAction({ requestId });
      if (result.error) { setError(result.error); return; }
      router.push(backHref);
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-col gap-3">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <Button className="flex-1" onClick={() => handleReview("APPROVED")} disabled={isPending}>
            {isPending ? "Saving…" : "Approve"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => handleReview("DENIED")} disabled={isPending}>
            Deny
          </Button>
        </div>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleRevoke}
          disabled={isPending}
        >
          {isPending ? "Revoking…" : "Revoke access"}
        </Button>
      </div>
    );
  }

  return null;
}
