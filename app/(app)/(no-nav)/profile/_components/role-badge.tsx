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

const ROLE_DESCRIPTIONS: Record<string, string> = {
  ORGANISER: "Organisers can create and manage events and series for their church.",
  ADMIN: "Admins can manage organisers and settings for their assigned churches.",
};

export function RoleBadge({ role }: { role: "ORGANISER" | "ADMIN" }) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <Badge
            variant="secondary"
            className="mt-1 gap-1 cursor-pointer"
            onClick={() => setOpen((v) => !v)}
          >
            <Shield className="w-3 h-3" />
            {role === "ADMIN" ? "Admin" : "Organiser"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56 text-center">
          {ROLE_DESCRIPTIONS[role]}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
