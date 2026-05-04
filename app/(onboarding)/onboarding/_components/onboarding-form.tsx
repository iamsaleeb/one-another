"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { onboardingSchema, type OnboardingInput } from "@/lib/validations/onboarding";
import { completeOnboardingAction, skipOnboardingAction } from "@/lib/actions/onboarding";

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
      phone: "",
      dateOfBirth: undefined,
      image: undefined,
    },
  });

  async function handleSubmit(data: OnboardingInput) {
    setIsSubmitting(true);
    const result = await completeOnboardingAction(data);
    if (result.error) {
      form.setError("root", { message: result.error });
      setIsSubmitting(false);
      return;
    }
    await update({ onboardingCompleted: true });
    router.push("/");
  }

  async function handleSkip() {
    setIsSkipping(true);
    await skipOnboardingAction();
    await update({ onboardingCompleted: true });
    router.push("/");
  }

  return (
    <div className="flex flex-col gap-6 px-4 pt-10 pb-10 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col gap-1 text-center">
        <span className="text-2xl font-bold text-primary">1Another</span>
        <h1 className="text-xl font-bold mt-2">Complete your profile</h1>
        <p className="text-sm text-muted-foreground">
          Help us personalise your experience. All fields are optional.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-5"
        >
          {/* Profile Photo */}
          <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
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
          <div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
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
                            ? format(parse(field.value, "yyyy-MM-dd", new Date()), "d MMMM yyyy")
                            : "Select date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-years"
                        selected={field.value ? parse(field.value, "yyyy-MM-dd", new Date()) : undefined}
                        onSelect={(date) => {
                          field.onChange(date ? format(date, "yyyy-MM-dd") : undefined);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date > new Date()}
                        fromYear={1920}
                        toYear={new Date().getFullYear()}
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
            <p className="text-sm text-destructive text-center">
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
              className="w-full text-muted-foreground"
              disabled={isSubmitting || isSkipping}
              onClick={handleSkip}
            >
              {isSkipping ? "Skipping..." : "Skip for now"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
