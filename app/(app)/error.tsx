"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

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
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          An error occurred while loading this page.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={unstable_retry} variant="outline" size="sm">
          Try again
        </Button>
      </EmptyContent>
    </Empty>
  );
}
