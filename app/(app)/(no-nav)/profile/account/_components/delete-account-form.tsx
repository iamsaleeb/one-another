"use client";

import { useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteAccountAction } from "@/domains/auth/actions/auth";

const CONFIRM_PHRASE = "delete my account";

const schema = z.object({
  confirm: z.string().refine((v) => v.toLowerCase() === CONFIRM_PHRASE, {
    message: `Type "${CONFIRM_PHRASE}" exactly to confirm`,
  }),
});

type FormValues = z.infer<typeof schema>;

export function DeleteAccountForm() {
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { confirm: "" },
  });

  function onSubmit() {
    startTransition(async () => {
      await deleteAccountAction();
    });
  }

  return (
    <Card className="p-4">
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Controller
          control={form.control}
          name="confirm"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel
                htmlFor={field.name}
                className="text-muted-foreground block text-sm"
              >
                Type{" "}
                <span className="text-foreground font-semibold">
                  {CONFIRM_PHRASE}
                </span>{" "}
                to confirm
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder={CONFIRM_PHRASE}
                autoComplete="off"
                spellCheck={false}
                disabled={isPending}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Button
          type="submit"
          variant="destructive"
          className="w-full"
          disabled={isPending}
        >
          {isPending ? "Deleting…" : "Delete My Account"}
        </Button>
      </form>
    </Card>
  );
}
