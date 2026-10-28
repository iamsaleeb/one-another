"use client";

import { Card } from "@/components/ui/card";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  onboardingSchema,
  type OnboardingInput,
} from "@/domains/profile/validations/onboarding";
import { completeOnboardingAction } from "@/domains/profile/actions/onboarding";

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
    </div>
  );
}

function StepPhoto() {
  const form = useFormContext<OnboardingInput>();
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground text-sm">
        Your photo helps organisers recognise you at events. Only organisers can
        see it.
      </p>
      <Controller
        control={form.control}
        name="image"
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={field.name}>
              Photo{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </FieldLabel>
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
    </div>
  );
}

function StepDetails() {
  const form = useFormContext<OnboardingInput>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
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
            <p className="text-muted-foreground text-xs">
              Only shared with organisers when you register for an event.
            </p>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />

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
            <p className="text-muted-foreground text-xs">
              Helps us show you age-appropriate events.
            </p>
            <FieldError errors={[fieldState.error]} />
          </Field>
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
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const advancingRef = useRef(false);
  const submittingRef = useRef(false);

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
    if (advancingRef.current) return;
    advancingRef.current = true;
    setIsAdvancing(true);
    try {
      if (currentStep === 0) {
        const valid = await form.trigger("name");
        if (!valid) return;
      }
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
    } finally {
      advancingRef.current = false;
      setIsAdvancing(false);
    }
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
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
      submittingRef.current = false;
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

      <FormProvider {...form}>
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => e.preventDefault()}
        >
          <Card className="gap-0 p-5">{renderStep()}</Card>

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
              <Button
                type="button"
                onClick={handleNext}
                disabled={isAdvancing}
                className="flex-1"
              >
                {isAdvancing ? "Checking..." : "Continue"}
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
      </FormProvider>
    </div>
  );
}
