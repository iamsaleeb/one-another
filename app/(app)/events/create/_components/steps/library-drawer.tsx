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
import { TYPE_LABELS, type LibraryItem } from "@/lib/validations/questions";

interface LibraryDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: LibraryItem[];
  onSelect: (item: LibraryItem) => void;
}

export function LibraryDrawer({ open, onOpenChange, items, onSelect }: LibraryDrawerProps) {
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

        <div className="px-4 flex flex-col gap-3">
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pb-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {items.length === 0 ? "No saved questions yet." : "No matches found."}
              </p>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 text-left hover:bg-muted/50 active:bg-muted min-h-[56px]"
                  onClick={() => {
                    onSelect(item);
                    onOpenChange(false);
                  }}
                >
                  <span className="text-sm font-medium line-clamp-2">{item.label}</span>
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
            <Button variant="outline" className="w-full">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
