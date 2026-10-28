"use client";

import { Trash2 } from "lucide-react";
import { ConfirmActionButton } from "@/components/confirm-action-button";
import { deleteSeriesAction } from "@/domains/series/actions/series";

export function DeleteSeriesButton({ seriesId }: { seriesId: string }) {
  return (
    <ConfirmActionButton
      icon={Trash2}
      label="Delete series"
      title="Delete this series?"
      description="This series and all its sessions will be permanently deleted and cannot be undone."
      destructive
      action={deleteSeriesAction.bind(null, seriesId)}
    />
  );
}
