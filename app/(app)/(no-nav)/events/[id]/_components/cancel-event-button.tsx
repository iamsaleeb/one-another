"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { cancelEventAction } from "@/domains/events/actions/crud";
import {
  cancelEventSchema,
  type CancelEventInput,
} from "@/domains/events/validations/event";

export function CancelEventButton({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const form = useForm<CancelEventInput>({
    resolver: zodResolver(cancelEventSchema),
    defaultValues: { reason: "" },
  });
  const { isSubmitting } = form.formState;

  // Redirects to the Event on success.
  const onSubmit = form.handleSubmit(async (data) => {
    const result = await cancelEventAction(eventId, data);
    const message = result.error ?? result.fieldErrors?.reason?.[0];
    if (message) form.setError("reason", { message });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label="Cancel event"
          className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive size-9"
        >
          <Ban />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel event</DialogTitle>
          <DialogDescription>
            The event will remain visible but marked as cancelled. Please
            provide a reason for attendees.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <Controller
            control={form.control}
            name="reason"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="cancel-reason" className="sr-only">
                  Reason
                </FieldLabel>
                <Textarea
                  id="cancel-reason"
                  aria-invalid={fieldState.invalid}
                  placeholder="Reason for cancellation…"
                  rows={3}
                  disabled={isSubmitting}
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Keep event
              </Button>
            </DialogClose>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting && <Spinner />}
              Cancel event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
