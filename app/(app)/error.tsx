"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
      <p className="text-base font-semibold">Something went wrong</p>
      <p className="text-muted-foreground text-sm">
        An error occurred while loading this page.
      </p>
      <Button onClick={unstable_retry} variant="outline" size="sm">
        Try again
      </Button>
    </div>
  );
}
