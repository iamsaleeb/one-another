"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ApprovalStatus } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  reviewRequestAction,
  revokeAccessAction,
} from "@/domains/approvals/actions/requests";

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
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(backHref);
    });
  }

  function handleRevoke() {
    setError(null);
    startTransition(async () => {
      const result = await revokeAccessAction({ requestId });
      if (result.error) {
        setError(result.error);
        return;
      }
      router.push(backHref);
    });
  }

  if (status === "PENDING") {
    return (
      <div className="flex flex-col gap-3">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex-1" disabled={isPending}>
                {isPending ? "Saving…" : "Approve"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Approve request?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will grant the user access. You can revoke it later.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReview("APPROVED")}>
                  Approve
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="flex-1" disabled={isPending}>
                Deny
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Deny request?</AlertDialogTitle>
                <AlertDialogDescription>
                  The user will be notified that their request was denied.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReview("DENIED")}>
                  Deny
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }

  if (status === "APPROVED") {
    return (
      <div className="flex flex-col gap-2">
        {error && <p className="text-destructive text-sm">{error}</p>}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              className="border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={isPending}
            >
              {isPending ? "Revoking…" : "Revoke access"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke access?</AlertDialogTitle>
              <AlertDialogDescription>
                This will immediately remove the user&apos;s access. This action
                cannot be undone without re-approving.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Revoke
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return null;
}
