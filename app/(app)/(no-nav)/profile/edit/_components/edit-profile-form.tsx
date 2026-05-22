"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";
import { updateProfileAction } from "@/lib/actions/profile";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

      await update({ name: values.name, image: values.image });
      router.push("/profile");
    });
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="shadow-card flex flex-col gap-5 rounded-2xl bg-white p-5">
          {/* Photo */}
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Profile photo</FormLabel>
                <FormControl>
                  <PhotoUploadField
                    variant="profile"
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Name */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Doe"
                    autoComplete="name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Phone */}
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Phone number{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+44 7700 900000"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Date of birth */}
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Date of birth{" "}
                  <span className="text-muted-foreground font-normal">
                    (optional)
                  </span>
                </FormLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
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
                    </FormControl>
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {form.formState.errors.root && (
          <p className="text-destructive text-center text-sm">
            {form.formState.errors.root.message}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Form>
  );
}
