"use client";

import { formatDistanceToNow } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import type { AccessRequestStatus } from "@prisma/client";

interface Props {
  status: AccessRequestStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

const OUTCOME_LABELS: Partial<Record<AccessRequestStatus, string>> = {
  APPROVED: "Approved",
  DENIED: "Denied",
  CANCELLED: "Cancelled",
  REVOKED: "Revoked",
};

const OUTCOME_COLORS: Partial<Record<AccessRequestStatus, string>> = {
  APPROVED: "text-success",
  DENIED: "text-destructive",
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
            <Check className="text-primary-foreground size-3.5" />
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
                ? "border-warning bg-warning/10"
                : "bg-primary border-primary"
            }`}
          >
            {isPending ? (
              <Clock className="text-warning size-3.5" />
            ) : (
              <Check className="text-primary-foreground size-3.5" />
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
                  ? "bg-success"
                  : "bg-muted border-muted-foreground border-2"
              }`}
            >
              {status === "APPROVED" ? (
                <Check className="text-primary-foreground size-3.5" />
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
