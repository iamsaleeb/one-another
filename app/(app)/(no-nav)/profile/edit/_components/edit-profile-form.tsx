"use client";

import { Card } from "@/components/ui/card";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/domains/profile/validations/onboarding";
import { updateProfileAction } from "@/domains/profile/actions/profile";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PhotoUploadField } from "@/components/photo-upload-field";

interface EditProfileFormProps {
  defaultValues: OnboardingInput;
}

export function EditProfileForm({ defaultValues }: EditProfileFormProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = useTransition();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues,
  });

  function onSubmit(values: OnboardingInput) {
    startTransition(async () => {
      const result = await updateProfileAction(values);

      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }

      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
          form.setError(field as keyof OnboardingInput, {
            message: msgs?.[0],
          })
        );
        return;
      }

      await update({ name: values.name, image: values.image ?? null });
      router.push("/profile");
    });
  }

  return (
    <FormProvider {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <Card className="gap-5 p-5">
          {/* Photo */}
          <Controller
            control={form.control}
            name="image"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Profile photo</FieldLabel>
                <PhotoUploadField
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  variant="profile"
                  value={field.value}
                  onChange={field.onChange}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {/* Name */}
          <Controller
            control={form.control}
            name="name"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Full name</FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {/* Phone */}
          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Phone number{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Input
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  type="tel"
                  placeholder="+44 7700 900000"
                  {...field}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {/* Date of birth */}
          <Controller
            control={form.control}
            name="dateOfBirth"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Date of birth{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FieldLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      type="button"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 size-4 opacity-70" />
                      {field.value
                        ? format(
                            parse(field.value, "yyyy-MM-dd", new Date()),
                            "d MMMM yyyy"
                          )
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      captionLayout="dropdown-years"
                      selected={
                        field.value
                          ? parse(field.value, "yyyy-MM-dd", new Date())
                          : undefined
                      }
                      onSelect={(date) => {
                        field.onChange(
                          date ? format(date, "yyyy-MM-dd") : undefined
                        );
                        setCalendarOpen(false);
                      }}
                      disabled={(date) => date > new Date()}
                      startMonth={new Date(1920, 0)}
                      endMonth={new Date()}
                      defaultMonth={
                        field.value
                          ? parse(field.value, "yyyy-MM-dd", new Date())
                          : new Date(new Date().getFullYear() - 25, 0)
                      }
                    />
                  </PopoverContent>
                </Popover>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </Card>

        {form.formState.errors.root && (
          <p className="text-destructive text-center text-sm">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </FormProvider>
  );
}
