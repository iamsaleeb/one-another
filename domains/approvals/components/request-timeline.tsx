"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import type { ApprovalStatus } from "@prisma/client";

interface Props {
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

const OUTCOME_LABELS: Partial<Record<ApprovalStatus, string>> = {
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
};

const OUTCOME_COLORS: Partial<Record<ApprovalStatus, string>> = {
  APPROVED: "text-green-600",
  DENIED: "text-red-500",
  CANCELLED: "text-muted-foreground",
  REVOKED: "text-muted-foreground",
};

export function RequestTimeline({ status, createdAt, reviewedAt }: Props) {
  const isPending = status === "PENDING";
  const isResolved = !isPending;
  const outcomeLabel = OUTCOME_LABELS[status];
  const outcomeColor = OUTCOME_COLORS[status] ?? "text-foreground";

  return (
    <div className="flex flex-col gap-0">
      {/* Step 1: Requested */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div className="bg-primary flex size-6 items-center justify-center rounded-full">
            <Check className="size-3.5 text-white" />
          </div>
          <div
            className="bg-border my-1 w-px flex-1"
            style={{ minHeight: 24 }}
          />
        </div>
        <div className="pb-4">
          <p className="text-sm font-medium">Requested</p>
          <p className="text-muted-foreground text-xs" suppressHydrationWarning>
            {formatDistanceToNow(createdAt, { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Step 2: Under review */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center">
          <div
            className={`flex size-6 items-center justify-center rounded-full border-2 ${
              isPending
                ? "border-amber-400 bg-amber-50"
                : "bg-primary border-primary"
            }`}
          >
            {isPending ? (
              <Clock className="size-3.5 text-amber-500" />
            ) : (
              <Check className="size-3.5 text-white" />
            )}
          </div>
          {isResolved && (
            <div
              className="bg-border my-1 w-px flex-1"
              style={{ minHeight: 24 }}
            />
          )}
        </div>
        <div className="pb-4">
          <p className="text-sm font-medium">Under review</p>
          {isPending && (
            <p className="text-muted-foreground text-xs">
              Waiting for approval
            </p>
          )}
        </div>
      </div>

      {/* Step 3: Outcome (only if resolved) */}
      {isResolved && (
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center">
            <div
              className={`flex size-6 items-center justify-center rounded-full ${
                status === "APPROVED"
                  ? "bg-green-500"
                  : "bg-muted border-muted-foreground border-2"
              }`}
            >
              {status === "APPROVED" ? (
                <Check className="size-3.5 text-white" />
              ) : (
                <X className="text-muted-foreground size-3.5" />
              )}
            </div>
          </div>
          <div>
            <p className={`text-sm font-medium ${outcomeColor}`}>
              {outcomeLabel}
            </p>
            {reviewedAt && (
              <p
                className="text-muted-foreground text-xs"
                suppressHydrationWarning
              >
                {formatDistanceToNow(reviewedAt, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
