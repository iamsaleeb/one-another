"use client";

import { useState } from "react";
import Link from "next/link";
import { MoreHorizontal, Share2 } from "lucide-react";
import type { ApprovalStatus, ResourceType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RESOURCE_PATHS } from "@/domains/approvals/lib/constants";
import { MyRequestDrawer } from "./my-request-drawer";

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
  isAuthenticated: boolean;
  hasContributorAccess: boolean;
  myRequest: MyRequest | null;
  pendingCount: number;
  isApprover: boolean;
}

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  hasContributorAccess,
  myRequest,
  pendingCount,
  isApprover,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const basePath = `/${RESOURCE_PATHS[resourceType]}/${resourceId}`;
  const status = myRequest?.status ?? null;

  const showHelpOut =
    isAuthenticated &&
    !hasContributorAccess &&
    (status === null ||
      status === "DENIED" ||
      status === "CANCELLED" ||
      status === "REVOKED");
  const showViewRequest = status === "PENDING";
  const showViewAccess = status === "APPROVED";

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
        <DropdownMenuContent align="end" className="w-48">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              Help out
            </DropdownMenuItem>
          )}
          {showViewRequest && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              View my request
            </DropdownMenuItem>
          )}
          {showViewAccess && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              View my access
            </DropdownMenuItem>
          )}
          {isApprover && (
            <DropdownMenuItem asChild>
              <Link
                href={`${basePath}/helpers`}
                className="flex w-full items-center justify-between"
              >
                Manage helpers
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {pendingCount}
                  </Badge>
                )}
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {(showHelpOut || showViewRequest || showViewAccess) && (
        <MyRequestDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          resourceType={resourceType}
          resourceId={resourceId}
          resourceName={resourceName}
          myRequest={myRequest}
        />
      )}
    </>
  );
}
