"use client";

import { useState } from "react";
import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RoleBadgeRole =
  | "PLATFORM_ADMIN"
  | "CHURCH_ADMIN"
  | "EVENT_MANAGER"
  | "EVENT_CREATOR";

const ROLE_LABELS: Record<RoleBadgeRole, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  CHURCH_ADMIN: "Church Admin",
  EVENT_MANAGER: "Event Manager",
  EVENT_CREATOR: "Event Creator",
};

const ROLE_DESCRIPTIONS: Record<RoleBadgeRole, string> = {
  PLATFORM_ADMIN: "Full access across all churches and events on the platform.",
  CHURCH_ADMIN:
    "Full control of their church — events, series, and member management.",
  EVENT_MANAGER:
    "Can create, publish, and manage events and series for their church.",
  EVENT_CREATOR:
    "Can create events for their church and edit the events they created.",
};

export function RoleBadge({ role }: { role: RoleBadgeRole }) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="mt-1 cursor-pointer gap-1"
            onClick={() => setOpen((v) => !v)}
          >
            <Shield className="h-3 w-3" />
            {ROLE_LABELS[role]}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56 text-center">
          {ROLE_DESCRIPTIONS[role]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
