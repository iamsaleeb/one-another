"use client";

import type { ApprovalStatus, ResourceType } from "@prisma/client";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { MyRequestView } from "./my-request-view";

interface MyRequest {
  id: string;
  status: ApprovalStatus;
  createdAt: Date;
  reviewedAt: Date | null;
  message: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  myRequest: MyRequest | null;
}

function drawerTitle(status: ApprovalStatus | null): string {
  if (status === "PENDING") return "Your request";
  if (status === "APPROVED") return "Access granted";
  return "Help out";
}

export function MyRequestDrawer({
  open,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  myRequest,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{drawerTitle(myRequest?.status ?? null)}</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <MyRequestView
            resourceType={resourceType}
            resourceId={resourceId}
            resourceName={resourceName}
            myRequest={myRequest}
            onClose={onClose}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
