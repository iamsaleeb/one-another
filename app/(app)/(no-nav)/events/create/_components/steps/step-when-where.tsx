"use client";

import { Controller, useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import type { CreateEventInput } from "@/domains/events/validations/event";

export function StepWhenWhere() {
  const form = useFormContext<CreateEventInput>();
  const startDate = useWatch({ control: form.control, name: "date" });

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Start Date</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                type="date"
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="time"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Start Time</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                type="time"
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Controller
          control={form.control}
          name="endDate"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>End Date</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                type="date"
                min={startDate || undefined}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="endTime"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>End Time</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                type="time"
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <Controller
        control={form.control}
        name="location"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Location</FieldLabel>
            <Input
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="e.g. 123 Church Street, Sydney NSW 2000"
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="host"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Host</FieldLabel>
            <Input
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="e.g. Pastor John Smith"
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
    </div>
  );
}
