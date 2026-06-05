"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { ResourceType } from "@prisma/client";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { submitRequestAction } from "@/domains/approvals/actions/requests";

const FormSchema = z.object({
  message: z.string().max(280, "Max 280 characters").optional(),
});
type FormValues = z.infer<typeof FormSchema>;

interface Props {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export function RequestForm({ resourceType, resourceId, resourceName }: Props) {
  const router = useRouter();
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { message: "" },
  });

  async function onSubmit(values: FormValues) {
    const result = await submitRequestAction({
      resourceType,
      resourceId,
      message: values.message || undefined,
    });
    if (result.error) {
      form.setError("root.serverError", {
        type: "server",
        message: result.error,
      });
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Request to help with{" "}
        <span className="text-foreground font-medium">{resourceName}</span>. The
        organiser will review your request.
      </p>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Add an optional message… (max 280 chars)"
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.formState.errors.root?.serverError && (
            <p className="text-destructive text-sm">
              {form.formState.errors.root.serverError.message}
            </p>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Sending…" : "Send request"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
