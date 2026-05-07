"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, ChevronLeft, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  registerEventAction,
  unattendEventAction,
} from "@/lib/actions/events-attendance";
import {
  registrationFormSchema,
  type RegistrationFormValues,
  type EventMetadata,
} from "@/lib/validations/event";
import { QuestionType, type Question } from "@/lib/validations/questions";
import { getCampDays, formatDayLabel } from "@/lib/datetime";
import { QuestionsForm } from "./questions-form";

interface RegistrationDrawerProps {
  eventId: string;
  eventTitle: string;
  isRegistered: boolean;
  userName: string;
  userEmail: string;
  collectPhone: boolean;
  collectNotes: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  camp?: EventMetadata["camp"];
  campStartDate?: string;
  questions?: Question[];
  existingResponses?: Record<string, { answer: string | null; fileUrl: string | null }>;
}

function abbreviateName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] ?? name;
  return `${parts[0]} ${parts[parts.length - 1][0]}.`;
}

function buildDefaultResponses(
  questions: Question[] | undefined,
  existing: Record<string, { answer: string | null; fileUrl: string | null }> | undefined
): RegistrationFormValues["responses"] {
  if (!questions?.length) return {};
  const out: RegistrationFormValues["responses"] = {};
  for (const q of questions) {
    const prev = existing?.[q.id];
    out[q.id] = {
      answer: prev?.answer ?? (q.type === QuestionType.YES_NO ? "false" : null),
      fileUrl: prev?.fileUrl ?? null,
    };
  }
  return out;
}

export function RegistrationDrawer({
  eventId,
  eventTitle,
  isRegistered,
  userName,
  userEmail: _userEmail,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
  camp,
  campStartDate,
  questions,
  existingResponses,
}: RegistrationDrawerProps) {
  const showPartialDays =
    camp?.allowPartialRegistration === true && !!campStartDate && !!camp.endDate;
  const allDays =
    showPartialDays && campStartDate && camp?.endDate
      ? getCampDays(campStartDate, camp.endDate)
      : [];

  const hasQuestions = !!questions?.length;
  const hasOptionalFields = collectPhone || collectNotes || showPartialDays;
  const skipDetailsStep = !hasOptionalFields && hasQuestions;

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: {
      phone: "",
      notes: "",
      selectedDays: allDays,
      responses: buildDefaultResponses(questions, existingResponses),
    },
  });

  const [step, setStep] = useState<"details" | number>(skipDetailsStep ? 0 : "details");
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [unattendPending, startUnattendTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      form.reset({
        phone: "",
        notes: "",
        selectedDays: allDays,
        responses: buildDefaultResponses(questions, existingResponses),
      });
      setStep(skipDetailsStep ? 0 : "details");
      setServerError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onQuestionStep = typeof step === "number";
  const showConfirmation = isRegistered && !hasQuestions;
  const isLastQuestion = onQuestionStep && hasQuestions && step === questions!.length - 1;

  function getSubmitLabel() {
    if (isPending) return isRegistered ? "Updating..." : "Registering...";
    return isRegistered ? "Update responses" : "Register";
  }

  async function handleNext() {
    if (step === "details") {
      setStep(0);
      return;
    }

    const currentQ = questions![step as number];

    if (currentQ.required) {
      const responses = form.getValues("responses") ?? {};
      const response = responses[currentQ.id];
      const hasValue =
        currentQ.type === QuestionType.FILE_UPLOAD
          ? !!response?.fileUrl
          : !!(response?.answer?.trim());

      if (!hasValue) {
        const fieldName =
          currentQ.type === QuestionType.FILE_UPLOAD
            ? `responses.${currentQ.id}.fileUrl`
            : `responses.${currentQ.id}.answer`;
        form.setError(fieldName as Parameters<typeof form.setError>[0], {
          type: "required",
          message: "This field is required.",
        });
        return;
      }
    }

    form.clearErrors();
    setStep((s) => (s as number) + 1);
  }

  function handleBack() {
    form.clearErrors();
    if (skipDetailsStep && step === 0) {
      onOpenChange(false);
      return;
    }
    setStep((s) => (typeof s === "number" && s > 0 ? s - 1 : "details"));
  }

  function handleUnregister() {
    startUnattendTransition(async () => {
      await unattendEventAction(eventId);
      onOpenChange(false);
    });
  }

  function onSubmit(data: RegistrationFormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await registerEventAction(eventId, data);
      if (result.error) {
        setServerError(result.error);
        setStep(skipDetailsStep ? 0 : "details");
      } else {
        onOpenChange(false);
      }
    });
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent
        aria-describedby={undefined}
        className="h-[100dvh] mt-0 rounded-t-none flex flex-col"
      >
        {/* Header */}
        <DrawerHeader className="flex-none px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 flex items-center justify-start">
              {onQuestionStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 -ml-2"
                  onClick={handleBack}
                  disabled={isPending}
                >
                  <ChevronLeft className="size-5" />
                </Button>
              )}
            </div>
            <DrawerTitle className="flex-1 text-center text-base">
              {isRegistered ? "Your Registration" : `Register for ${eventTitle}`}
            </DrawerTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 -mr-2"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              <X className="size-5" />
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-0.5">
            Registering as {abbreviateName(userName)}
          </p>

          {onQuestionStep && hasQuestions && (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {questions!.map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full transition-colors ${
                    i <= (step as number) ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                Question {(step as number) + 1} of {questions!.length}
              </span>
            </div>
          )}
        </DrawerHeader>

        {/* Confirmation state */}
        {showConfirmation ? (
          <>
            <div className="flex-1 flex flex-col items-center justify-center gap-3 px-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-8 text-primary" />
              </div>
              <p className="text-base font-medium">You&apos;re registered!</p>
              <p className="text-sm text-muted-foreground text-center">
                See you at {eventTitle}.
              </p>
            </div>
            <DrawerFooter className="flex-none px-4 pb-6 gap-2">
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <button
                type="button"
                onClick={handleUnregister}
                disabled={unattendPending}
                className="text-xs text-destructive text-center w-full py-1 disabled:opacity-50"
              >
                {unattendPending ? "Cancelling..." : "Cancel registration"}
              </button>
            </DrawerFooter>
          </>
        ) : (
          /* Registration form */
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              {/* Details step */}
              {!onQuestionStep && (
                <div className="flex flex-col gap-4">
                  {showPartialDays && allDays.length > 0 && (
                    <Controller
                      control={form.control}
                      name="selectedDays"
                      render={({ field }) => (
                        <div className="flex flex-col gap-2">
                          <Label>Which days will you attend?</Label>
                          <div className="flex flex-col gap-2 rounded-xl border px-3 py-3">
                            {allDays.map((day) => (
                              <div key={day} className="flex items-center gap-2.5">
                                <Checkbox
                                  id={`day-${day}`}
                                  checked={(field.value ?? []).includes(day)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value ?? [];
                                    field.onChange(
                                      checked
                                        ? [...current, day]
                                        : current.filter((d) => d !== day)
                                    );
                                  }}
                                  disabled={isPending}
                                />
                                <Label
                                  htmlFor={`day-${day}`}
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  {formatDayLabel(day)}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    />
                  )}

                  {collectPhone && (
                    <Controller
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <div className="grid gap-1.5">
                          <Label htmlFor="phone">Phone number</Label>
                          <Input
                            id="phone"
                            {...field}
                            type="tel"
                            placeholder="+44 7700 000000"
                            disabled={isPending}
                          />
                        </div>
                      )}
                    />
                  )}

                  {collectNotes && (
                    <Controller
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <div className="grid gap-1.5">
                          <Label htmlFor="notes">Dietary / accessibility needs</Label>
                          <Textarea
                            id="notes"
                            {...field}
                            rows={3}
                            placeholder="Let us know if you have any requirements..."
                            disabled={isPending}
                          />
                        </div>
                      )}
                    />
                  )}
                </div>
              )}

              {/* Question step */}
              {onQuestionStep && hasQuestions && (
                <QuestionsForm
                  questions={questions!}
                  control={form.control}
                  activeIndex={step as number}
                  disabled={isPending}
                />
              )}
            </div>

            {/* Single CTA footer */}
            <DrawerFooter className="flex-none px-4 pb-6 gap-2">
              {!onQuestionStep && (
                <>
                  {hasQuestions ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={
                        isPending ||
                        (showPartialDays
                          ? (form.watch("selectedDays") ?? []).length === 0
                          : false)
                      }
                      className="w-full"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isPending} className="w-full">
                      {getSubmitLabel()}
                    </Button>
                  )}
                  {showPartialDays && (form.watch("selectedDays") ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Select at least one day to continue.
                    </p>
                  )}
                  {isRegistered && (
                    <button
                      type="button"
                      onClick={handleUnregister}
                      disabled={unattendPending}
                      className="text-xs text-destructive text-center w-full py-1 disabled:opacity-50"
                    >
                      {unattendPending ? "Cancelling..." : "Cancel registration"}
                    </button>
                  )}
                </>
              )}

              {onQuestionStep && (
                <>
                  {isLastQuestion ? (
                    <Button type="submit" disabled={isPending} className="w-full">
                      {getSubmitLabel()}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isPending}
                      className="w-full"
                    >
                      Next
                    </Button>
                  )}
                </>
              )}
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
