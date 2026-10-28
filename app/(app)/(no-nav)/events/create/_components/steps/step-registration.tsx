"use client";

import { useEffect } from "react";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PriceInput } from "@/domains/events/components/price-input";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import type { CreateEventInput } from "@/domains/events/validations/event";

export function StepRegistration() {
  const form = useFormContext<CreateEventInput>();

  const requiresRegistration = useWatch({
    control: form.control,
    name: "requiresRegistration",
  });
  const tag = useWatch({ control: form.control, name: "tag" });
  const isCamp = tag === "Camp";

  useEffect(() => {
    if (isCamp) form.setValue("requiresRegistration", true);
  }, [isCamp, form]);

  return (
    <div className="flex flex-col gap-5">
      <Controller
        control={form.control}
        name="price"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Price (optional)</FieldLabel>
            <PriceInput
              id={field.name}
              aria-invalid={fieldState.invalid}
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="requiresRegistration"
        render={({ field, fieldState }) => (
          <Field
            data-invalid={fieldState.invalid}
            orientation="horizontal"
            className="items-center justify-between gap-3 rounded-xl border px-4 py-3"
          >
            <FieldContent className="gap-0.5">
              <FieldLabel htmlFor={field.name}>
                Requires Registration
              </FieldLabel>
              <FieldDescription className="text-xs">
                {isCamp
                  ? "Required for camps"
                  : "Attendees must fill in a registration form"}
              </FieldDescription>
            </FieldContent>
            <Switch
              id={field.name}
              aria-invalid={fieldState.invalid}
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
              disabled={isCamp}
            />
          </Field>
        )}
      />

      {requiresRegistration && (
        <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
          <p className="text-sm font-medium">Registration options</p>

          <Controller
            control={form.control}
            name="capacity"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Spots available (optional)
                </FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value === "" ? undefined : Number(e.target.value)
                    )
                  }
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="collectPhone"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="items-center justify-between gap-3"
              >
                <FieldLabel
                  htmlFor={field.name}
                  className="text-muted-foreground font-normal"
                >
                  Ask for phone number
                </FieldLabel>
                <Switch
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="collectNotes"
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                orientation="horizontal"
                className="items-center justify-between gap-3"
              >
                <FieldLabel
                  htmlFor={field.name}
                  className="text-muted-foreground font-normal"
                >
                  Ask for dietary / accessibility needs
                </FieldLabel>
                <Switch
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  checked={field.value ?? false}
                  onCheckedChange={field.onChange}
                />
              </Field>
            )}
          />
        </div>
      )}
    </div>
  );
}
