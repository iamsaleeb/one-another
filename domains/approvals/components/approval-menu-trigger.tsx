"use client";

import { useState } from "react";
import { MoreHorizontal, Share2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { ResourceType } from "@prisma/client";
import { RequestAccessDrawer } from "./request-access-drawer";

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isAuthenticated: boolean;
  requestStatus: "PENDING" | "APPROVED" | "DENIED" | null;
  hasRole: boolean;
}

export function ApprovalMenuTrigger({
  resourceType,
  resourceId,
  resourceName,
  isAuthenticated,
  requestStatus,
  hasRole,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Show "Help out" for new requests and after denial (backend upsert resets DENIED → PENDING)
  const showHelpOut = isAuthenticated && !hasRole && (requestStatus === null || requestStatus === "DENIED");
  const showPending = requestStatus === "PENDING";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9" aria-label="More options">
            <MoreHorizontal className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showHelpOut && (
            <DropdownMenuItem onSelect={() => setDrawerOpen(true)}>
              Help out
            </DropdownMenuItem>
          )}
          {showPending && (
            <DropdownMenuItem disabled>
              Request pending…
            </DropdownMenuItem>
          )}
          <DropdownMenuItem disabled>
            <Share2 className="mr-2 size-4" />
            Share
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RequestAccessDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resourceType={resourceType}
        resourceId={resourceId}
        resourceName={resourceName}
      />
    </>
  );
}
