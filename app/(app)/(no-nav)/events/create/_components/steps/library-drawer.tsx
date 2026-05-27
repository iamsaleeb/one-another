// app/(app)/events/create/_components/steps/library-drawer.tsx
"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TYPE_LABELS,
  type LibraryItem,
} from "@/domains/events/questions/validations";

interface LibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LibraryItem[];
  onSelect: (item: LibraryItem) => void;
}

export function LibraryDrawer({
  open,
  onOpenChange,
  items,
  onSelect,
}: LibraryDrawerProps) {
  const [search, setSearch] = useState("");

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>Pick from library</DrawerTitle>
        </DrawerHeader>

        <div className="flex flex-col gap-3 px-4">
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-sm">
                {items.length === 0
                  ? "No saved questions yet."
                  : "No matches found."}
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="bg-background hover:bg-muted/50 active:bg-muted flex min-h-[56px] items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left"
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                >
                  <span className="line-clamp-2 text-sm font-medium">
                    {item.label}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-xs">
                    {TYPE_LABELS[item.type]}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </div>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
