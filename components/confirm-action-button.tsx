"use client";

import { useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmActionButtonProps {
  icon: LucideIcon;
  // The trigger's accessible name, and the confirm button's text.
  label: string;
  title: string;
  description: string;
  destructive?: boolean;
  // A server action that redirects when it's done.
  action: () => Promise<void>;
}

// An icon button that asks before running a server action.
export function ConfirmActionButton({
  icon: Icon,
  label,
  title,
  description,
  destructive,
  action,
}: ConfirmActionButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={label}
          className={cn(
            "size-9",
            destructive &&
              "text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          )}
        >
          <Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            disabled={pending}
            onClick={(e) => {
              // Stay open until the action redirects away.
              e.preventDefault();
              startTransition(action);
            }}
          >
            {pending && <Spinner />}
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
