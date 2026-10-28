"use client";

import {
  Controller,
  useFieldArray,
  useFormContext,
  useWatch,
} from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import type { CreateEventInput } from "@/domains/events/validations/event";

export function StepCampDetails() {
  const form = useFormContext<CreateEventInput>();
  // A camp's days run from the Event's start to its end.
  const startDate = useWatch({ control: form.control, name: "date" });
  const endDate = useWatch({ control: form.control, name: "endDate" });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "campAgenda",
  });

  return (
    <div className="border-primary/20 bg-primary/5 flex flex-col gap-4 rounded-2xl border-2 px-4 py-4">
      <p className="text-primary text-sm font-semibold">Camp Details</p>

      <Controller
        control={form.control}
        name="campAllowPartialRegistration"
        render={({ field, fieldState }) => (
          <Field
            data-invalid={fieldState.invalid}
            orientation="horizontal"
            className="bg-card items-center justify-between gap-3 rounded-xl border px-4 py-3"
          >
            <FieldContent className="gap-0.5">
              <FieldLabel htmlFor={field.name}>
                Allow Partial Attendance
              </FieldLabel>
              <FieldDescription className="text-xs">
                Let attendees choose which days to attend
              </FieldDescription>
            </FieldContent>
            <Switch
              id={field.name}
              aria-invalid={fieldState.invalid}
              checked={field.value ?? false}
              onCheckedChange={field.onChange}
            />
          </Field>
        )}
      />

      {/* Agenda builder */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Schedule / Agenda</p>

        {fields.length === 0 && (
          <p className="text-muted-foreground py-2 text-center text-xs">
            No agenda items yet. Add items to show attendees what&apos;s
            planned.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-card flex flex-col gap-2 rounded-xl border px-3 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs font-medium">
                Item {index + 1}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive size-7"
                onClick={() => remove(index)}
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Controller
                control={form.control}
                name={`campAgenda.${index}.date`}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name} className="text-xs">
                      Date
                    </FieldLabel>
                    <Input
                      id={f.name}
                      aria-invalid={fieldState.invalid}
                      type="date"
                      min={startDate || undefined}
                      max={endDate || undefined}
                      {...f}
                      value={f.value ?? ""}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                control={form.control}
                name={`campAgenda.${index}.time`}
                render={({ field: f, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={f.name} className="text-xs">
                      Time (optional)
                    </FieldLabel>
                    <Input
                      id={f.name}
                      aria-invalid={fieldState.invalid}
                      type="time"
                      {...f}
                      value={f.value ?? ""}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              control={form.control}
              name={`campAgenda.${index}.title`}
              render={({ field: f, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={f.name} className="text-xs">
                    Title
                  </FieldLabel>
                  <Input
                    id={f.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="e.g. Morning worship"
                    {...f}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              control={form.control}
              name={`campAgenda.${index}.description`}
              render={({ field: f, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={f.name} className="text-xs">
                    Description (optional)
                  </FieldLabel>
                  <Textarea
                    id={f.name}
                    aria-invalid={fieldState.invalid}
                    rows={2}
                    {...f}
                    value={f.value ?? ""}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() =>
            append({
              id:
                crypto.randomUUID?.() ??
                `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
              date: startDate ?? "",
              time: undefined,
              title: "",
              description: undefined,
            })
          }
        >
          <Plus className="mr-1 size-4" />
          Add Agenda Item
        </Button>
      </div>
    </div>
  );
}
