"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { deleteAccountAction } from "@/lib/actions/auth";

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
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="rounded-2xl bg-white shadow-card p-4 flex flex-col gap-4"
      >
        <FormField
          control={form.control}
          name="confirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm text-muted-foreground">
                Type{" "}
                <span className="font-semibold text-foreground">{CONFIRM_PHRASE}</span>{" "}
                to confirm
              </FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder={CONFIRM_PHRASE}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
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
    </Form>
  );
}
