"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { saveDraftAction, updateEventAction } from "@/lib/actions/events-crud";
import { utcIsoToLocalInputs } from "@/lib/datetime";
import { WizardProgress } from "./wizard-progress";
import { StepBasics } from "./steps/step-basics";
import { StepWhenWhere } from "./steps/step-when-where";
import { StepRegistration } from "./steps/step-registration";
import { StepCampDetails } from "./steps/step-camp-details";
import { StepReview } from "./steps/step-review";

interface Church {
  id: string;
  name: string;
}

interface Series {
  id: string;
  name: string;
  churchId: string;
  churchName: string;
}

interface EventWizardProps {
  churches: Church[];
  series?: Series | null;
  eventId?: string;
  defaultValues?: Partial<CreateEventInput> & { datetimeISO?: string };
}

const BASE_STEPS = [
  { label: "Basics" },
  { label: "When & Where" },
  { label: "Registration" },
];
const CAMP_STEP = { label: "Camp Details" };
const REVIEW_STEP = { label: "Review" };

const STEP_FIELDS: (keyof CreateEventInput)[][] = [
  ["title", "description", "tag", "churchId", "photoUrl"],
  ["date", "time", "location", "host"],
  ["price", "requiresRegistration", "capacity", "collectPhone", "collectNotes"],
  ["campEndDate", "campAllowPartialRegistration", "campAgenda"],
];

export function EventWizard({ churches, series, eventId, defaultValues }: EventWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<string | undefined>(eventId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { datetimeISO, ...restDefaultValues } = defaultValues ?? {};

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: defaultValues
      ? { ...restDefaultValues }
      : {
          title: "",
          date: "",
          time: "",
          location: "",
          host: "",
          tag: "",
          description: "",
          churchId: series?.churchId ?? "",
          seriesId: series?.id ?? undefined,
          requiresRegistration: false,
          capacity: undefined,
          collectPhone: false,
          collectNotes: false,
          price: undefined,
          isDraft: false,
          photoUrl: undefined,
          campEndDate: undefined,
          campAllowPartialRegistration: false,
          campAgenda: [],
        },
  });

  useEffect(() => {
    if (defaultValues?.datetimeISO) {
      const { date, time } = utcIsoToLocalInputs(defaultValues.datetimeISO);
      form.setValue("date", date, { shouldDirty: false });
      form.setValue("time", time, { shouldDirty: false });
    }
  }, []);

  const tag = useWatch({ control: form.control, name: "tag" });

  const activeSteps = [...BASE_STEPS, ...(tag === "Camp" ? [CAMP_STEP] : []), REVIEW_STEP];

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    const valid = await form.trigger(fields as (keyof CreateEventInput)[]);
    if (!valid) return;

    setIsSaving(true);
    try {
      const data = form.getValues();
      const result = await saveDraftAction(draftId, data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDraftId(result.eventId);
      setCurrentStep((s) => s + 1);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const data = form.getValues();
      const result = await saveDraftAction(draftId, data);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDraftId(result.eventId);
      toast.success("Draft saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!draftId) {
      toast.error("Save a draft first.");
      return;
    }
    setIsPublishing(true);
    try {
      const data = form.getValues();
      const result = await updateEventAction(draftId, { ...data, isDraft: false });
      if (result?.error) toast.error(result.error);
      // updateEventAction redirects on success — no need to handle success case
    } finally {
      setIsPublishing(false);
    }
  };

  const isReviewStep = currentStep === activeSteps.length - 1;

  const renderStep = () => {
    if (isReviewStep) {
      return (
        <StepReview
          onPublish={handlePublish}
          onSaveDraft={handleSaveDraft}
          isPublishing={isPublishing}
          isSaving={isSaving}
          isDraftEvent={!!draftId}
          churches={churches}
        />
      );
    }

    switch (currentStep) {
      case 0:
        return <StepBasics churches={churches} series={series} />;
      case 1:
        return <StepWhenWhere />;
      case 2:
        return <StepRegistration />;
      case 3:
        return <StepCampDetails />;
      default:
        return null;
    }
  };

  return (
    <>
      <WizardProgress
        currentStep={currentStep + 1}
        totalSteps={activeSteps.length}
        stepLabel={activeSteps[currentStep].label}
      />

      <div className="rounded-2xl bg-white shadow-card p-5">
        <Form {...form}>
          <form className="flex flex-col gap-5">
            {renderStep()}

            {!isReviewStep && (
              <div className="flex gap-2 pt-2">
                {currentStep > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={isSaving}
                  className="flex-1"
                >
                  {isSaving ? "Saving..." : "Next"}
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </>
  );
}
