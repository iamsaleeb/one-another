"use client";

import { useState, useTransition } from "react";
import type { ApprovalStatus } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cancelRequestAction } from "../actions/requests";
import { RequestTimeline } from "./request-timeline";
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

export function RequestStatusDrawer({
  open,
  onOpenChange,
  myRequest,
  resourceName,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
          <RequestTimeline
            status={myRequest.status}
            createdAt={myRequest.createdAt}
            reviewedAt={myRequest.reviewedAt}
          />

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
