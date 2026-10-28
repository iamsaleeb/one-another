"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { CATEGORY_OPTIONS } from "@/lib/types/search";
import type { CreateEventInput } from "@/domains/events/validations/event";

interface StepBasicsProps {
  churches: Array<{ id: string; name: string }>;
  series?: {
    id: string;
    name: string;
    churchId: string;
    churchName: string;
  } | null;
  // A published Event stays in its Church, so the Church is shown, not edited.
  fixedChurch?: { id: string; name: string } | null;
  // A published Event keeps its Category.
  categoryLocked?: boolean;
}

export function StepBasics({
  churches,
  series,
  fixedChurch,
  categoryLocked,
}: StepBasicsProps) {
  const form = useFormContext<CreateEventInput>();
  // A session lives in its Series' Church.
  const shownChurch = series
    ? { id: series.churchId, name: series.churchName }
    : fixedChurch;

  return (
    <div className="flex flex-col gap-5">
      {series && (
        <div className="bg-primary/10 flex items-center gap-2 rounded-xl px-3 py-2.5">
          <Repeat className="text-primary size-4 shrink-0" />
          <p className="text-primary text-sm font-medium">
            Session for: {series.name}
          </p>
        </div>
      )}

      <Controller
        control={form.control}
        name="photoUrl"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Cover Photo (optional)</FieldLabel>
            <PhotoUploadField
              id={field.name}
              aria-invalid={fieldState.invalid}
              variant="cover"
              value={field.value}
              onChange={field.onChange}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Title</FieldLabel>
            <Input
              id={field.name}
              aria-invalid={fieldState.invalid}
              placeholder="e.g. Sunday Evening Worship"
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Description</FieldLabel>
            <Textarea
              id={field.name}
              aria-invalid={fieldState.invalid}
              rows={4}
              placeholder="e.g. Join us for an evening of worship, prayer and community. All are welcome."
              {...field}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      <Controller
        control={form.control}
        name="tag"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>Category</FieldLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={categoryLocked}
            >
              <SelectTrigger id={field.name} aria-invalid={fieldState.invalid}>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

      {shownChurch ? (
        <Field data-disabled>
          <FieldLabel htmlFor="church">Church</FieldLabel>
          <Select value={shownChurch.id} disabled>
            <SelectTrigger id="church">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={shownChurch.id}>{shownChurch.name}</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      ) : (
        <Controller
          control={form.control}
          name="churchId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Church</FieldLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="Select a church" />
                </SelectTrigger>
                <SelectContent>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      )}
    </div>
  );
}
