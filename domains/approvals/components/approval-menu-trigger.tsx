// domains/approvals/components/approval-menu-trigger.tsx
"use client";

import { useState } from "react";
import { MoreHorizontal, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { RequestAccessDrawer } from "./request-access-drawer";
import { RequestStatusDrawer } from "./request-status-drawer";
import { ApproverRequestsDrawer } from "./approver-requests-drawer";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface PendingRequest {
  id: string;
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  requester: { id: string; name: string | null; image: string | null };
}

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  hasRole: boolean;
  myRequest: MyRequest | null;
  pendingRequests: PendingRequest[];
  isApprover: boolean;
}

type DrawerState = "request-access" | "my-status" | "approver" | null;

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  hasRole,
  myRequest,
  pendingRequests,
  isApprover,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState<DrawerState>(null);

  const requestStatus = myRequest?.status ?? null;

  const showHelpOut =
    isAuthenticated &&
    !hasRole &&
    (requestStatus === null || requestStatus === "DENIED");
  const showViewRequest = requestStatus === "PENDING";
  const showApproverItem = isApprover && pendingRequests.length > 0;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label="More options"
          >
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("request-access")}>
              Help out
            </DropdownMenuItem>
          )}
          {showViewRequest && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("my-status")}>
              View my request
            </DropdownMenuItem>
          )}
          {showApproverItem && (
            <DropdownMenuItem onSelect={() => setDrawerOpen("approver")}>
              Help requests
              <Badge variant="secondary" className="ml-auto">
                {pendingRequests.length}
              </Badge>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestAccessDrawer
        open={drawerOpen === "request-access"}
        onOpenChange={(open) => setDrawerOpen(open ? "request-access" : null)}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />

      {myRequest && (
        <RequestStatusDrawer
          open={drawerOpen === "my-status"}
          onOpenChange={(open) => setDrawerOpen(open ? "my-status" : null)}
          myRequest={myRequest}
          resourceName={resourceName}
        />
      )}

      <ApproverRequestsDrawer
        open={drawerOpen === "approver"}
        onOpenChange={(open) => setDrawerOpen(open ? "approver" : null)}
        requests={pendingRequests}
        resourceType={resourceType}
        resourceId={resourceId}
      />
    </>
  );
}
