"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteSeriesAction } from "@/lib/actions/series";

export function DeleteSeriesButton({ seriesId }: { seriesId: string }) {
  const action = deleteSeriesAction.bind(null, seriesId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="size-9 text-destructive border-destructive/30 hover:bg-destructive/10">
          <Trash2 className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Series</DialogTitle>
          <DialogDescription>
            Are you sure? This series and all its sessions will be permanently deleted and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <form action={action}>
            <Button type="submit" variant="destructive" className="w-full">
              Delete Series
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
