"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { HelperSummaryRow } from "./helper-summary-row";
import type { ApprovalStatus } from "@prisma/client";

interface RequestRow {
  id: string;
  requestedRole: string;
  message: string | null;
  createdAt: Date;
  status: ApprovalStatus;
  requester: { name: string | null; image: string | null };
}

interface Props {
  pendingRequests: RequestRow[];
  resolvedRequests: RequestRow[];
  basePath: string;
}

export function HelpersTabs({
  pendingRequests,
  resolvedRequests,
  basePath,
}: Props) {
  const members = resolvedRequests.filter((r) => r.status === "APPROVED");
  const history = resolvedRequests.filter((r) => r.status !== "APPROVED");

  return (
    <Tabs
      defaultValue={pendingRequests.length > 0 ? "requests" : "members"}
      className="px-4"
    >
      <TabsList className="w-full">
        <TabsTrigger value="requests" className="flex-1 gap-1.5">
          Requests
          {pendingRequests.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {pendingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="members" className="flex-1">
          Members
        </TabsTrigger>
        <TabsTrigger value="history" className="flex-1">
          History
        </TabsTrigger>
      </TabsList>

      <TabsContent value="requests">
        <div className="py-2">
          {pendingRequests.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No pending requests
            </p>
          ) : (
            pendingRequests.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                requestedRole={req.requestedRole}
                message={req.message}
                createdAt={req.createdAt}
                status="PENDING"
              />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="members">
        <div className="py-2">
          {members.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No approved members
            </p>
          ) : (
            members.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                requestedRole={req.requestedRole}
                message={req.message}
                createdAt={req.createdAt}
                status="APPROVED"
              />
            ))
          )}
        </div>
      </TabsContent>

      <TabsContent value="history">
        <div className="py-2">
          {history.length === 0 ? (
            <p className="text-muted-foreground py-10 text-center text-sm">
              No history yet
            </p>
          ) : (
            history.map((req) => (
              <HelperSummaryRow
                key={req.id}
                href={`${basePath}/${req.id}`}
                requester={req.requester}
                requestedRole={req.requestedRole}
                message={req.message}
                createdAt={req.createdAt}
                status={req.status}
              />
            ))
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
