"use client";

import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  createSeriesSchema,
  type CreateSeriesInput,
} from "@/domains/series/validations/series";
import { createSeriesAction } from "@/domains/series/actions/series";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { CATEGORY_OPTIONS } from "@/lib/types/search";

const CADENCE_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

interface Church {
  id: string;
  name: string;
}

export function CreateSeriesForm({ churches }: { churches: Church[] }) {
  const form = useForm<CreateSeriesInput>({
    resolver: zodResolver(createSeriesSchema),
    defaultValues: {
      name: "",
      description: "",
      cadence: undefined,
      location: "",
      host: "",
      tag: "",
      churchId: "",
      photoUrl: undefined,
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await createSeriesAction(data);
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
        form.setError(field as keyof CreateSeriesInput, { message: msgs[0] })
      );
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>
              {form.formState.errors.root.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Cover photo — top so organisers set the visual identity first */}
        <Controller
          control={form.control}
          name="photoUrl"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Cover Photo (optional)
              </FieldLabel>
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

        {/* What */}
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Alpha Course"
                disabled={isSubmitting}
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
                rows={3}
                placeholder="e.g. A weekly series exploring the Christian faith through discussion and community."
                disabled={isSubmitting}
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
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
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

        {/* Organisation */}
        <Controller
          control={form.control}
          name="churchId"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Church</FieldLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
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

        {/* Pattern */}
        <Controller
          control={form.control}
          name="cadence"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Cadence</FieldLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectValue placeholder="How often does this series run?" />
                </SelectTrigger>
                <SelectContent>
                  {CADENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        {/* Who / Where */}
        <Controller
          control={form.control}
          name="host"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Host</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Pastor Jane Doe"
                disabled={isSubmitting}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Controller
          control={form.control}
          name="location"
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Location</FieldLabel>
              <Input
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="e.g. Main Hall, 123 Church Street"
                disabled={isSubmitting}
                {...field}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Series"}
        </Button>
      </form>
    </FormProvider>
  );
}
