"use client";

import { useState } from "react";
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
import {
  completeOnboardingAction,
  skipOnboardingAction,
} from "@/lib/actions/onboarding";

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

export function OnboardingForm() {
  const router = useRouter();
  const { update } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      phone: "",
      dateOfBirth: undefined,
      image: undefined,
    },
  });

  const nameValue = form.watch("name");
  const canSkip = nameValue.trim().length >= 2;

  async function handleSubmit(data: OnboardingInput) {
    setIsSubmitting(true);
    const result = await completeOnboardingAction(data);
    if (result.error) {
      form.setError("root", { message: result.error });
      setIsSubmitting(false);
      return;
    }
    if (result.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
        form.setError(field as keyof OnboardingInput, { message: msgs[0] })
      );
      setIsSubmitting(false);
      return;
    }
    await update({ onboardingCompleted: true });
    router.push("/");
  }

  async function handleSkip() {
    if (!canSkip) return;
    setIsSkipping(true);
    await skipOnboardingAction(nameValue.trim());
    await update({ onboardingCompleted: true });
    router.push("/");
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-10 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <span className="text-primary text-2xl font-bold">1Another</span>
        <h1 className="mt-2 text-xl font-bold">Complete your profile</h1>
        <p className="text-muted-foreground text-sm">
          Your name is required. Other details are optional.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Name */}
          <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
            <p className="text-sm font-medium">Your name</p>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Profile Photo */}
          <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
            <p className="text-sm font-medium">Profile photo</p>
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
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
          </div>

          {/* Personal Details */}
          <div className="shadow-card flex flex-col gap-4 rounded-2xl bg-white p-5">
            <p className="text-sm font-medium">Personal details</p>

            {/* Phone */}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
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

            {/* Date of Birth */}
            <FormField
              control={form.control}
              name="dateOfBirth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date of birth</FormLabel>
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

          {/* Root error */}
          {form.formState.errors.root && (
            <p className="text-destructive text-center text-sm">
              {form.formState.errors.root.message}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || isSkipping}
            >
              {isSubmitting ? "Saving..." : "Save & continue"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground w-full"
              disabled={isSubmitting || isSkipping || !canSkip}
              onClick={handleSkip}
            >
              {isSkipping ? "Skipping..." : "Skip optional details"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
