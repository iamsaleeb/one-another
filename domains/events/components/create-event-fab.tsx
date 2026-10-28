"use client";

import Link from "next/link";
import { CalendarPlus, Plus, X, Repeat } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function CreateEventFAB({
  isOrganiser,
  canCreateSeries,
}: {
  isOrganiser: boolean;
  canCreateSeries: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!isOrganiser) return null;

  return (
    <div className="bottom-nav-fab fixed right-4 z-50">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            aria-label={open ? "Close menu" : "Create new"}
            className="size-14 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            {open ? <X className="size-6" /> : <Plus className="size-6" />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" sideOffset={12}>
          {canCreateSeries && (
            <DropdownMenuItem asChild>
              <Link href="/series/create">
                <Repeat className="text-primary" />
                New Series
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href="/events/create">
              <CalendarPlus className="text-primary" />
              New Event
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
