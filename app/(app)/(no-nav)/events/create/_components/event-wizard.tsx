"use client";

import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import {
  FormProvider,
  useForm,
  useWatch,
  type Resolver,
} from "react-hook-form";
import { useEventAutoSave } from "./use-event-auto-save";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CloudUpload, Check, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  createEventSchema,
  type CreateEventInput,
} from "@/domains/events/validations/event";
import {
  saveDraftAction,
  saveEventEditsAction,
} from "@/domains/events/actions/crud";
import { localInputsToUtcDate, utcIsoToLocalInputs } from "@/lib/datetime";
import { withInstants } from "./with-instants";
import { WizardProgress } from "./wizard-progress";
import { StepBasics } from "./steps/step-basics";
import { StepWhenWhere } from "./steps/step-when-where";
import { StepRegistration } from "./steps/step-registration";
import { StepCampDetails } from "./steps/step-camp-details";
import { StepReview } from "./steps/step-review";
import { StepQuestions } from "./steps/step-questions";
import type { LibraryItem } from "@/domains/events/questions/validations";

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
  fixedChurch?: Church | null;
  eventId?: string;
  defaultValues?: Partial<CreateEventInput>;
  libraryItems?: LibraryItem[];
  questionsLocked?: boolean;
}

type StepKey =
  | "basics"
  | "whenWhere"
  | "registration"
  | "questions"
  | "campDetails"
  | "review";
interface WizardStep {
  label: string;
  key: StepKey;
  fields: Array<keyof CreateEventInput>;
}

export function EventWizard({
  churches,
  series,
  fixedChurch,
  eventId,
  defaultValues,
  libraryItems,
  questionsLocked,
}: EventWizardProps) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const { datetimeISO, endDatetimeISO, ...restDefaultValues } =
    defaultValues ?? {};
  const seedStart = datetimeISO ? utcIsoToLocalInputs(datetimeISO) : null;
  const seedEnd = endDatetimeISO ? utcIsoToLocalInputs(endDatetimeISO) : null;

  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema) as Resolver<CreateEventInput>,
    defaultValues: defaultValues
      ? {
          date: seedStart?.date ?? "",
          time: seedStart?.time ?? "",
          endDate: seedEnd?.date ?? "",
          endTime: seedEnd?.time ?? "",
          questions: [],
          ...restDefaultValues,
        }
      : {
          title: "",
          date: "",
          time: "",
          endDate: "",
          endTime: "",
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
          campAllowPartialRegistration: false,
          campAgenda: [],
          questions: [],
        },
  });

  // Editing an Event that is already published: it stays published and keeps
  // its Category, and its edits go live only when saved on the Review step.
  const published = defaultValues?.isDraft === false;

  const { draftId, setDraftId, autoSaveStatus, autoSaveError, markPublished } =
    useEventAutoSave({
      form,
      initialDraftId: eventId,
      enabled: !published,
      isBusy: isSaving || isPublishing,
    });
  const hasUnsavedEdits = form.formState.isDirty;
  const tag = useWatch({ control: form.control, name: "tag" });
  const requiresRegistration = useWatch({
    control: form.control,
    name: "requiresRegistration",
  });

  const activeSteps: WizardStep[] = [
    {
      label: "Basics",
      key: "basics",
      fields: ["title", "description", "tag", "churchId", "photoUrl"],
    },
    {
      label: "When & Where",
      key: "whenWhere",
      fields: ["date", "time", "endDate", "endTime", "location", "host"],
    },
    {
      label: "Registration",
      key: "registration",
      fields: [
        "price",
        "requiresRegistration",
        "capacity",
        "collectPhone",
        "collectNotes",
      ],
    },
    ...(requiresRegistration
      ? [
          {
            label: "Questions",
            key: "questions" as StepKey,
            fields: ["questions"] as Array<keyof CreateEventInput>,
          },
        ]
      : []),
    ...(tag === "Camp"
      ? [
          {
            label: "Camp Details",
            key: "campDetails" as StepKey,
            fields: ["campAllowPartialRegistration", "campAgenda"] as Array<
              keyof CreateEventInput
            >,
          },
        ]
      : []),
    { label: "Review", key: "review", fields: [] },
  ];

  // Clamp to the last step when steps are removed (e.g. requiresRegistration toggled off)
  const currentStep = Math.min(stepIndex, activeSteps.length - 1);

  // Clear questions from form state when registration is disabled so they aren't persisted
  useEffect(() => {
    if (!requiresRegistration) {
      form.setValue("questions", [], { shouldDirty: false });
    }
  }, [requiresRegistration, form]);

  const buildData = () => withInstants(form.getValues());

  // Validate the current step's fields then advance — auto-save persists a
  // draft in the background
  const handleNext = async () => {
    const step = activeSteps[currentStep];
    if (!step) return;
    const valid = await form.trigger(step.fields);
    if (!valid) return;
    // Only an Event still to come can be published, so catch a past date here
    // rather than at the last step.
    if (step.key === "whenWhere") {
      const { date, time, endDate, endTime } = form.getValues();
      const start = localInputsToUtcDate(date, time);
      if (start <= new Date()) {
        form.setError("date", { message: "Date must be in the future" });
        return;
      }
      if (localInputsToUtcDate(endDate, endTime) <= start) {
        form.setError("endDate", { message: "End must be after the start" });
        return;
      }
    }
    setStepIndex(currentStep + 1);
  };

  const handleBack = () => setStepIndex(Math.max(0, currentStep - 1));

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const result = await saveDraftAction(draftId, {
        ...buildData(),
        isDraft: true,
      });
      if (!("eventId" in result)) {
        toast.error(
          "error" in result
            ? result.error
            : "Please check your entries and try again."
        );
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
        const draft = await saveDraftAction(undefined, {
          ...buildData(),
          isDraft: true,
        });
        if (!("eventId" in draft)) {
          toast.error(
            "error" in draft ? draft.error : "Failed to save. Please try again."
          );
          return;
        }
        id = draft.eventId;
        setDraftId(id);
        form.setValue("isDraft", true, { shouldDirty: false });
      }
      const result = await saveEventEditsAction(id, {
        ...buildData(),
        isDraft: false,
      });
      if (result && "error" in result) {
        toast.error(result.error);
        return;
      }
      if (result && "fieldErrors" in result) {
        toast.error(
          Object.values(result.fieldErrors ?? {}).flat()[0] ??
            "Please review all fields before publishing."
        );
        return;
      }
      markPublished();
      toast.success(published ? "Changes saved" : "Event published!");
      router.push(`/events/${id}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const currentStepKey = activeSteps[currentStep]?.key;
  const isReviewStep = currentStepKey === "review";

  const renderStep = () => {
    switch (currentStepKey) {
      case "basics":
        return (
          <StepBasics
            churches={churches}
            series={series}
            fixedChurch={fixedChurch}
            categoryLocked={published}
          />
        );
      case "whenWhere":
        return <StepWhenWhere />;
      case "registration":
        return <StepRegistration />;
      case "questions":
        return (
          <StepQuestions
            libraryItems={libraryItems ?? []}
            locked={questionsLocked}
          />
        );
      case "campDetails":
        return <StepCampDetails />;
      case "review":
        return (
          <StepReview
            onPublish={handlePublish}
            onSaveDraft={handleSaveDraft}
            isPublishing={isPublishing}
            isSaving={isSaving}
            published={published}
            churches={churches}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <WizardProgress
        currentStep={currentStep + 1}
        totalSteps={activeSteps.length}
        stepLabel={activeSteps[currentStep].label}
      />

      <div className="flex flex-col items-center gap-1">
        {published ? (
          hasUnsavedEdits && (
            <>
              <Badge
                variant="warning"
                className="border-warning/20 gap-1.5 px-3 py-1 [&>svg]:size-3.5"
              >
                <CircleAlert />
                Unsaved changes
              </Badge>
              <p className="text-muted-foreground text-center text-xs">
                Tap Save Changes on the Review step to update the event
              </p>
            </>
          )
        ) : (
          <>
            <Badge
              variant={
                autoSaveStatus === "saved"
                  ? "success"
                  : autoSaveStatus === "error"
                    ? "warning"
                    : "outline"
              }
              className={cn(
                "gap-1.5 px-3 py-1 transition-colors duration-300 [&>svg]:size-3.5",
                autoSaveStatus === "saved"
                  ? "border-success/20"
                  : autoSaveStatus === "error"
                    ? "border-warning/20"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              {autoSaveStatus === "saved" ? (
                <Check />
              ) : autoSaveStatus === "saving" ? (
                <Spinner />
              ) : autoSaveStatus === "error" ? (
                <CircleAlert />
              ) : (
                <CloudUpload />
              )}
              {autoSaveStatus === "saving"
                ? "Saving..."
                : autoSaveStatus === "saved"
                  ? "Progress saved"
                  : autoSaveStatus === "error"
                    ? "Couldn't save progress"
                    : "Auto-saving progress"}
            </Badge>
            {autoSaveStatus === "error" && autoSaveError && (
              <p className="text-muted-foreground text-center text-xs">
                {autoSaveError}
              </p>
            )}
          </>
        )}
      </div>

      <Card className="gap-0 p-5">
        <FormProvider {...form}>
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
                <Button type="button" onClick={handleNext} className="flex-1">
                  Next
                </Button>
              </div>
            )}
          </form>
        </FormProvider>
      </Card>
    </div>
  );
}
