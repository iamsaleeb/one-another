"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { saveDraftAction, saveEventAction } from "@/lib/actions/events-crud";
import { localInputsToUtcDate, utcIsoToLocalInputs } from "@/lib/datetime";
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

const STEP_FIELDS: Array<Array<keyof CreateEventInput>> = [
  ["title", "description", "tag", "churchId", "photoUrl"],
  ["date", "time", "location", "host"],
  ["price", "requiresRegistration", "capacity", "collectPhone", "collectNotes"],
  ["campEndDate", "campAllowPartialRegistration", "campAgenda"],
];

export function EventWizard({ churches, series, eventId, defaultValues }: EventWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [draftId, setDraftId] = useState<string | undefined>(eventId);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { datetimeISO: _datetimeISO, ...restDefaultValues } = defaultValues ?? {};

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

  // Capture initial datetimeISO in a ref so the effect only seeds date/time once on mount
  const initialDatetimeISO = useRef(defaultValues?.datetimeISO);
  // Refs so the auto-save closure always sees the latest values without re-subscribing
  const draftIdRef = useRef(draftId);
  const isBusyRef = useRef(false);
  const setDraftIdRef = useRef(setDraftId);
  useEffect(() => { draftIdRef.current = draftId; }, [draftId]);
  useEffect(() => { isBusyRef.current = isSaving || isPublishing; }, [isSaving, isPublishing]);

  // Seed date/time inputs from the UTC ISO stored on the event (edit mode only)
  useEffect(() => {
    if (initialDatetimeISO.current) {
      const { date, time } = utcIsoToLocalInputs(initialDatetimeISO.current);
      form.setValue("date", date, { shouldDirty: false });
      form.setValue("time", time, { shouldDirty: false });
    }
  }, [form]);

  // Silently auto-save whenever form values change (create and edit flows)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (isBusyRef.current) return;
        const data = form.getValues();
        // Skip auto-create if the form is completely empty (user hasn't started)
        if (!draftIdRef.current && !data.title && !data.description && !data.tag) return;
        const payload =
          data.date && data.time
            ? { ...data, datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString() }
            : data;
        const result = await saveDraftAction(draftIdRef.current, payload);
        if ("eventId" in result && !draftIdRef.current) {
          draftIdRef.current = result.eventId;
          setDraftIdRef.current(result.eventId);
        }
      }, 1500);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [form]);

  const tag = useWatch({ control: form.control, name: "tag" });

  const activeSteps = [...BASE_STEPS, ...(tag === "Camp" ? [CAMP_STEP] : []), REVIEW_STEP];

  const buildData = (): CreateEventInput & { datetimeISO?: string } => {
    const data = form.getValues();
    if (data.date && data.time) {
      return { ...data, datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString() };
    }
    return data;
  };

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep];
    if (!fields) return;
    const valid = await form.trigger(fields as Array<keyof CreateEventInput>);
    if (!valid) return;

    setIsSaving(true);
    try {
      const isNew = !draftId;
      const result = await saveDraftAction(draftId, buildData());
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      setDraftId(result.eventId);
      if (isNew) toast.success("Draft saved — your progress is safe.");
      setCurrentStep((s) => s + 1);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await saveDraftAction(draftId, buildData());
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
      const result = await saveEventAction(draftId, { ...buildData(), isDraft: false });
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      if (result && "fieldErrors" in result) {
        toast.error("Please review all fields before publishing.");
        return;
      }
      toast.success("Event published!");
      router.push(`/events/${draftId}`);
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

    const disabled = isSaving || isPublishing;
    switch (currentStep) {
      case 0:
        return <StepBasics churches={churches} series={series} disabled={disabled} />;
      case 1:
        return <StepWhenWhere disabled={disabled} />;
      case 2:
        return <StepRegistration disabled={disabled} />;
      case 3:
        return <StepCampDetails disabled={disabled} />;
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

      <p className="text-xs text-muted-foreground text-center px-2">
        Your progress is automatically saved as a draft — you can leave and come back any time.
      </p>

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
