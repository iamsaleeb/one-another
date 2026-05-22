"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm, useFormContext } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/lib/validations/onboarding";
import { completeOnboardingAction } from "@/lib/actions/onboarding";

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
import { WizardProgress } from "@/app/(app)/(no-nav)/events/create/_components/wizard-progress";

const STEPS = [
  { label: "Your name" },
  { label: "Profile photo" },
  { label: "Personal details" },
] as const;

function StepName() {
  const form = useFormContext<OnboardingInput>();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        This is how you&apos;ll appear to other members.
      </p>
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
  );
}

function StepPhoto() {
  const form = useFormContext<OnboardingInput>();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Your photo helps organisers recognise you at events. Only organisers
        can see it.
      </p>
      <FormField
        control={form.control}
        name="image"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              Photo{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FormLabel>
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
  );
}

function StepDetails() {
  const form = useFormContext<OnboardingInput>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
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
              <Input type="tel" placeholder="+44 7700 900000" {...field} />
            </FormControl>
            <p className="text-muted-foreground text-xs">
              Only shared with organisers when you register for an event.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />

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
            <p className="text-muted-foreground text-xs">
              Helps us show you age-appropriate events.
            </p>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

export function OnboardingWizard({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const safeCallback =
    callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
      ? callbackUrl
      : "/";
  const { update } = useSession();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: "",
      phone: "",
      dateOfBirth: undefined,
      image: undefined,
    },
  });

  const handleNext = async () => {
    if (currentStep === 0) {
      const valid = await form.trigger("name");
      if (!valid) return;
    }
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result = await completeOnboardingAction(form.getValues());
      if (result.error) {
        form.setError("root", { message: result.error });
        return;
      }
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
          form.setError(field as keyof OnboardingInput, { message: msgs[0] })
        );
        return;
      }
      await update({ onboardingCompleted: true });
      router.push(safeCallback);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepName />;
      case 1:
        return <StepPhoto />;
      case 2:
        return <StepDetails />;
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 pt-10 pb-10">
      <div className="flex flex-col gap-1 text-center">
        <span className="text-primary text-2xl font-bold">1Another</span>
        <h1 className="mt-2 text-xl font-bold">Complete your profile</h1>
      </div>

      <WizardProgress
        currentStep={currentStep + 1}
        totalSteps={STEPS.length}
        stepLabel={STEPS[currentStep].label}
      />

      <Form {...form}>
        <form className="flex flex-col gap-5">
          <div className="shadow-card rounded-2xl bg-white p-5">
            {renderStep()}
          </div>

          {form.formState.errors.root && (
            <p className="text-destructive text-center text-sm">
              {form.formState.errors.root.message}
            </p>
          )}

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={handleNext} className="flex-1">
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Saving..." : "Complete profile"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
