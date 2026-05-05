"use client";

import { useState, useEffect } from "react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { useEventAutoSave } from "./use-event-auto-save";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CloudUpload, Check, Loader2 } from "lucide-react";
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
import { StepQuestions } from "./steps/step-questions";
import type { QuestionType } from "@/lib/validations/questions";

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

interface LibraryItem {
  id: string;
  type: QuestionType;
  label: string;
  options: string[];
}

interface EventWizardProps {
  churches: Church[];
  series?: Series | null;
  eventId?: string;
  defaultValues?: Partial<CreateEventInput> & { datetimeISO?: string };
  libraryItems?: LibraryItem[];
}

type StepKey = "basics" | "whenWhere" | "registration" | "questions" | "campDetails" | "review";
interface WizardStep { label: string; key: StepKey; fields: Array<keyof CreateEventInput> }

export function EventWizard({ churches, series, eventId, defaultValues, libraryItems }: EventWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { datetimeISO, ...restDefaultValues } = defaultValues ?? {};
  const seedDatetime = datetimeISO ? utcIsoToLocalInputs(datetimeISO) : null;

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema) as Resolver<CreateEventInput>,
    defaultValues: defaultValues
      ? { date: seedDatetime?.date ?? "", time: seedDatetime?.time ?? "", questions: [], ...restDefaultValues }
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
          questions: [],
        },
  });

  const { draftId, setDraftId, autoSaveStatus, markPublished } = useEventAutoSave({
    form,
    initialDraftId: eventId,
    initialIsDraft: defaultValues?.isDraft ?? true,
    isBusy: isSaving || isPublishing,
  });

  const tag = useWatch({ control: form.control, name: "tag" });
  const isDraft = useWatch({ control: form.control, name: "isDraft" });
  const requiresRegistration = useWatch({ control: form.control, name: "requiresRegistration" });

  const activeSteps: WizardStep[] = [
    { label: "Basics", key: "basics", fields: ["title", "description", "tag", "churchId", "photoUrl"] },
    { label: "When & Where", key: "whenWhere", fields: ["date", "time", "location", "host"] },
    { label: "Registration", key: "registration", fields: ["price", "requiresRegistration", "capacity", "collectPhone", "collectNotes"] },
    ...(requiresRegistration ? [{ label: "Questions", key: "questions" as StepKey, fields: ["questions"] as Array<keyof CreateEventInput> }] : []),
    ...(tag === "Camp" ? [{ label: "Camp Details", key: "campDetails" as StepKey, fields: ["campEndDate", "campAllowPartialRegistration", "campAgenda"] as Array<keyof CreateEventInput> }] : []),
    { label: "Review", key: "review", fields: [] },
  ];

  // Clamp currentStep when steps are removed (e.g. requiresRegistration toggled off)
  useEffect(() => {
    setCurrentStep((s) => Math.min(s, activeSteps.length - 1));
  }, [activeSteps.length]);

  const buildData = (): CreateEventInput & { datetimeISO?: string } => {
    const data = form.getValues();
    if (data.date && data.time) {
      return { ...data, datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString() };
    }
    return data;
  };

  // Validate the current step's fields then advance — auto-save persists in the background
  const handleNext = async () => {
    const step = activeSteps[currentStep];
    if (!step) return;
    const valid = await form.trigger(step.fields);
    if (!valid) return;
    // campEndDate is optional in schema (allows partial drafts) but required to publish
    if (step.key === "campDetails" && !form.getValues("campEndDate")) {
      form.setError("campEndDate", { message: "End date is required for camp events" });
      return;
    }
    setCurrentStep((s) => s + 1);
  };

  const handleBack = () => setCurrentStep((s) => Math.max(0, s - 1));

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await saveDraftAction(draftId, { ...buildData(), isDraft: true });
      if (!("eventId" in result)) {
        toast.error("error" in result ? result.error : "Please check your entries and try again.");
        return;
      }
      setDraftId(result.eventId);
      form.setValue("isDraft", true, { shouldDirty: false });
      toast.success("Draft saved");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      let id = draftId;
      if (!id) {
        // Edge case: user reaches publish before auto-save has fired
        const draft = await saveDraftAction(undefined, { ...buildData(), isDraft: true });
        if (!("eventId" in draft)) {
          toast.error("error" in draft ? draft.error : "Failed to save. Please try again.");
          return;
        }
        id = draft.eventId;
        setDraftId(id);
        form.setValue("isDraft", true, { shouldDirty: false });
      }
      const result = await saveEventAction(id, { ...buildData(), isDraft: false });
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      if (result && "fieldErrors" in result) {
        toast.error("Please review all fields before publishing.");
        return;
      }
      markPublished();
      toast.success("Event published!");
      router.push(`/events/${id}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentStepKey = activeSteps[currentStep]?.key;
  const isReviewStep = currentStepKey === "review";

  const renderStep = () => {
    switch (currentStepKey) {
      case "basics": return <StepBasics churches={churches} series={series} />;
      case "whenWhere": return <StepWhenWhere />;
      case "registration": return <StepRegistration />;
      case "questions": return <StepQuestions libraryItems={libraryItems ?? []} />;
      case "campDetails": return <StepCampDetails />;
      case "review":
        return (
          <StepReview
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            isPublishing={isPublishing}
            isSaving={isSaving}
            isDraftEvent={!!isDraft}
            churches={churches}
          />
        );
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <WizardProgress
        currentStep={currentStep + 1}
        totalSteps={activeSteps.length}
        stepLabel={activeSteps[currentStep].label}
      />

      <div className="flex justify-center">
        <div
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors duration-300 ${
            autoSaveStatus === "saved"
              ? "border-green-200 bg-green-50 text-green-700"
              : autoSaveStatus === "saving"
              ? "border-border bg-muted/50 text-muted-foreground"
              : "border-border bg-muted/50 text-muted-foreground"
          }`}
        >
          {autoSaveStatus === "saved" ? (
            <Check className="size-3.5 shrink-0" />
          ) : autoSaveStatus === "saving" ? (
            <Loader2 className="size-3.5 shrink-0 animate-spin" />
          ) : (
            <CloudUpload className="size-3.5 shrink-0" />
          )}
          {autoSaveStatus === "saving"
            ? "Saving..."
            : autoSaveStatus === "saved"
            ? "Progress saved"
            : "Auto-saving progress"}
        </div>
      </div>

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
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1"
                >
                  Next
                </Button>
              </div>
            )}
          </form>
        </Form>
      </div>
    </div>
  );
}
