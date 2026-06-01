"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import type { ApprovalStatus } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelRequestAction } from "../actions/requests";
import type { ApprovalActionState } from "../lib/types";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myRequest: MyRequest;
  resourceName: string;
}

const STATUS_CONFIG: Record<
  ApprovalStatus,
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
  },
  APPROVED: {
    label: "Approved",
    className: "bg-green-100 text-green-700 hover:bg-green-100",
  },
  DENIED: {
    label: "Denied",
    className: "bg-red-100 text-red-700 hover:bg-red-100",
  },
};

function formatDate(date: Date): string {
  return format(date, "d MMM yyyy, h:mm a");
}

export function RequestStatusDrawer({
  open,
  onOpenChange,
  myRequest,
  resourceName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const statusConfig = STATUS_CONFIG[myRequest.status];

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result: ApprovalActionState = await cancelRequestAction({
        requestId: myRequest.id,
      });
      if (result.error) {
        setError(result.error);
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Your request</DrawerTitle>
          <DrawerDescription>For {resourceName}</DrawerDescription>
        </DrawerHeader>

        <div className="flex flex-col gap-4 px-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm">Status</span>
            <Badge className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Requested</span>
              <span suppressHydrationWarning>
                {formatDate(myRequest.createdAt)}
              </span>
            </div>
            {myRequest.reviewedAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reviewed</span>
                <span suppressHydrationWarning>
                  {formatDate(myRequest.reviewedAt)}
                </span>
              </div>
            )}
          </div>

          {myRequest.message && (
            <>
              <Separator />
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground mb-1 text-xs">
                  Your message
                </p>
                <p className="text-sm italic">{myRequest.message}</p>
              </div>
            </>
          )}

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DrawerFooter>
          {myRequest.status === "PENDING" && (
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive/10"
              onClick={handleCancel}
              disabled={isPending}
            >
              {isPending ? "Cancelling…" : "Cancel request"}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
