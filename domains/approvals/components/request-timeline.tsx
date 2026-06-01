"use client";

import { format } from "date-fns";
import type { ApprovalStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

interface Props {
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
}

type StepState = "done" | "active" | "future" | "approved" | "denied" | "muted";

const DOT_CLASS: Record<StepState, string> = {
  done: "border-primary bg-primary",
  active: "border-amber-500 bg-amber-100",
  future: "border-muted-foreground/30 bg-transparent",
  approved: "border-green-600 bg-green-600",
  denied: "border-red-600 bg-red-600",
  muted: "border-muted-foreground/40 bg-muted-foreground/40",
};

const LABEL_CLASS: Record<StepState, string> = {
  done: "text-foreground",
  active: "text-amber-700",
  future: "text-muted-foreground",
  approved: "text-green-700",
  denied: "text-red-700",
  muted: "text-muted-foreground",
};

function Step({
  state,
  label,
  date,
}: {
  state: StepState;
  label: string;
  date?: Date | null;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <div
        className={cn(
          "size-3 shrink-0 rounded-full border-2",
          DOT_CLASS[state]
        )}
      />
      <span
        className={cn(
          "text-center text-xs leading-tight font-medium",
          LABEL_CLASS[state]
        )}
      >
        {label}
      </span>
      {date && (
        <span
          className="text-muted-foreground text-xs"
          suppressHydrationWarning
        >
          {format(date, "d MMM")}
        </span>
      )}
    </div>
  );
}

function Connector({ done }: { done: boolean }) {
  return (
    <div
      className={cn(
        "mt-1.5 h-0.5 flex-1",
        done ? "bg-primary" : "bg-muted-foreground/20"
      )}
    />
  );
}

const STEP3_CONFIG: Record<
  ApprovalStatus,
  { label: string; state: StepState }
> = {
  PENDING: { label: "Awaiting", state: "future" },
  APPROVED: { label: "Approved", state: "approved" },
  DENIED: { label: "Denied", state: "denied" },
  CANCELLED: { label: "Cancelled", state: "muted" },
  REVOKED: { label: "Revoked", state: "muted" },
};

export function RequestTimeline({ status, createdAt, reviewedAt }: Props) {
  const resolved = status !== "PENDING";
  const step3 = STEP3_CONFIG[status];

  return (
    <div className="flex items-start gap-1 py-2">
      <Step state="done" label="Submitted" date={createdAt} />
      <Connector done />
      <Step state={resolved ? "done" : "active"} label="Under Review" />
      <Connector done={resolved} />
      <Step
        state={step3.state}
        label={step3.label}
        date={resolved ? reviewedAt : null}
      />
    </div>
  );
}
