"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
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

function getDisplayAnswer(
  q: Question,
  resp: { answer: string | null; fileUrl: string | null } | undefined
): string | null {
  if (!resp) return null;
  if (q.type === QuestionType.FILE_UPLOAD) return resp.fileUrl ? "File uploaded" : null;
  if (q.type === QuestionType.YES_NO) return resp.answer === "true" ? "Yes" : "No";
  return resp.answer || null;
}

export function RegistrationDrawer({
  eventId,
  eventTitle,
  isRegistered,
  userName,
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
  const allDays = useMemo(
    () => (showPartialDays ? getCampDays(campStartDate!, camp!.endDate!) : []),
    [showPartialDays, campStartDate, camp?.endDate]
  );

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
  const [showSummary, setShowSummary] = useState(isRegistered);
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
  }, [open, form, allDays, questions, existingResponses, skipDetailsStep]);

  useEffect(() => {
    setShowSummary(isRegistered);
  }, [open, isRegistered]);

  const onQuestionStep = typeof step === "number";
  const isLastQuestion = onQuestionStep && hasQuestions && step === questions!.length - 1;
  const selectedDays = useWatch({ control: form.control, name: "selectedDays" });

  const answeredQuestions = hasQuestions
    ? questions!.filter((q) => getDisplayAnswer(q, existingResponses?.[q.id]) !== null)
    : [];

  function getSubmitLabel() {
    if (isPending) return isRegistered ? "Updating..." : "Registering...";
    return isRegistered ? "Update responses" : "Register";
  }

  function handleNext() {
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
    setStep((s) => ((s as number) > 0 ? (s as number) - 1 : "details"));
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
      <DrawerContent>
        <DrawerHeader className="px-4 pt-4 pb-2 shrink-0">
          <DrawerTitle className="text-base">
            {isRegistered ? "Your Registration" : `Register for ${eventTitle}`}
          </DrawerTitle>

          <DrawerDescription className={cn("text-xs", showSummary && "sr-only")}>
            {showSummary
              ? `You're registered for ${eventTitle}`
              : `Registering as ${abbreviateName(userName)}`}
          </DrawerDescription>

          {!showSummary && onQuestionStep && hasQuestions && (
            <div className="flex items-center gap-1.5 mt-2">
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

        {showSummary ? (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 shrink-0">
                  <Check className="size-4 text-primary" />
                </div>
                <p className="text-sm font-medium">You&apos;re registered for {eventTitle}</p>
              </div>

              {answeredQuestions.length > 0 && (
                <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
                  {answeredQuestions.map((q) => (
                    <div key={q.id} className="flex flex-col gap-0.5">
                      <p className="text-xs text-muted-foreground">{q.label}</p>
                      <p className="text-sm">{getDisplayAnswer(q, existingResponses?.[q.id])}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DrawerFooter className="shrink-0">
              {hasQuestions && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowSummary(false)}
                >
                  Update responses
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUnregister}
                disabled={unattendPending}
                className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {unattendPending && <Loader2 className="size-3.5 animate-spin" />}
                {unattendPending ? "Cancelling..." : "Cancel registration"}
              </Button>
            </DrawerFooter>
          </>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-2 flex flex-col gap-4">
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

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

              {onQuestionStep && hasQuestions && (
                <QuestionsForm
                  questions={questions!}
                  control={form.control}
                  activeIndex={step as number}
                  disabled={isPending}
                />
              )}
            </div>

            <DrawerFooter className="shrink-0">
              {!onQuestionStep && (
                <>
                  {hasQuestions ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isPending || (showPartialDays && (selectedDays ?? []).length === 0)}
                      className="w-full"
                    >
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={isPending}
                      className="w-full"
                    >
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      {getSubmitLabel()}
                    </Button>
                  )}
                  {showPartialDays && (selectedDays ?? []).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Select at least one day to continue.
                    </p>
                  )}
                </>
              )}

              {onQuestionStep && (
                <div className="flex gap-2">
                  {(step > 0 || !skipDetailsStep) && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleBack}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Back
                    </Button>
                  )}
                  {isLastQuestion ? (
                    <Button
                      type="button"
                      onClick={() => form.handleSubmit(onSubmit)()}
                      disabled={isPending}
                      className="flex-1"
                    >
                      {isPending && <Loader2 className="size-4 animate-spin" />}
                      {getSubmitLabel()}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNext}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Next
                    </Button>
                  )}
                </div>
              )}
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
