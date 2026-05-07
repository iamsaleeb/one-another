"use client";

import { useTransition, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { type RegistrationFormValues } from "@/lib/validations/event";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
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
  DrawerClose,
} from "@/components/ui/drawer";
import { registerEventAction, unattendEventAction, type RegisterEventState } from "@/lib/actions/events-attendance";
import type { EventMetadata } from "@/lib/validations/event";
import { getCampDays, formatDayLabel } from "@/lib/datetime";
import { QuestionsForm } from "./questions-form";
import type { Question } from "@/lib/validations/questions";

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

export function RegistrationDrawer({
  eventId,
  eventTitle,
  isRegistered,
  userName,
  userEmail,
  collectPhone,
  collectNotes,
  open,
  onOpenChange,
  camp,
  campStartDate,
  questions,
  existingResponses,
}: RegistrationDrawerProps) {
  const [state, setState] = useState<RegisterEventState>({});
  const { control } = useForm<RegistrationFormValues>();
  const [isPending, startRegisterTransition] = useTransition();
  const [unattendPending, startUnattendTransition] = useTransition();
  const [step, setStep] = useState<"details" | number>("details");

  const showPartialDays =
    camp?.allowPartialRegistration === true &&
    !!campStartDate &&
    !!camp.endDate;

  const allDays =
    showPartialDays && campStartDate && camp?.endDate
      ? getCampDays(campStartDate, camp.endDate)
      : [];

  const [selectedDays, setSelectedDays] = useState<string[]>(allDays);

  const hasQuestions = questions && questions.length > 0;
  const showConfirmation = isRegistered && !hasQuestions;
  const onQuestionStep = typeof step === "number";
  const isLastQuestion = onQuestionStep && hasQuestions && step === questions!.length - 1;

  useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  useEffect(() => {
    if (!open) setStep("details");
  }, [open]);

  useEffect(() => {
    if (state.error) setStep("details");
  }, [state.error]);

  function toggleDay(day: string) {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function handleUnregister() {
    startUnattendTransition(async () => {
      await unattendEventAction(eventId);
      onOpenChange(false);
    });
  }

  function goBack() {
    setStep((s) => (typeof s === "number" && s > 0 ? s - 1 : "details"));
  }

  function goNext() {
    setStep((s) => (s === "details" ? 0 : (s as number) + 1));
  }

  function getSubmitLabel(pending: boolean) {
    if (isRegistered) return pending ? "Updating..." : "Update responses";
    return pending ? "Registering..." : "Register";
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent aria-describedby={undefined}>
        <DrawerHeader>
          <DrawerTitle>
            {isRegistered ? "Your Registration" : `Register for ${eventTitle}`}
          </DrawerTitle>
          {onQuestionStep && hasQuestions && (
            <div className="flex items-center gap-1.5 mt-1">
              {questions!.map((_, i) => (
                <span
                  key={i}
                  className={`size-1.5 rounded-full ${i <= (step as number) ? "bg-primary" : "bg-muted"}`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                Question {(step as number) + 1} of {questions!.length}
              </span>
            </div>
          )}
        </DrawerHeader>

        {showConfirmation ? (
          <>
            <div className="px-4 pb-2 flex flex-col items-center gap-3 py-4">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Check className="size-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                You&apos;re registered for this event.
              </p>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </>
        ) : (
          <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const phone = fd.get("phone") as string | null;
            const notes = fd.get("notes") as string | null;
            const rawSelectedDays = fd.get("selectedDays");
            let parsedDays: string[] | undefined;
            if (typeof rawSelectedDays === "string" && rawSelectedDays) {
              try { parsedDays = JSON.parse(rawSelectedDays); } catch { /* ignore */ }
            }
            const responses: Record<string, { answer: string | null; fileUrl: string | null }> = {};
            for (const [key, value] of fd.entries()) {
              if (key.startsWith("response_file_")) {
                const qId = key.slice("response_file_".length);
                responses[qId] = { ...(responses[qId] ?? { answer: null, fileUrl: null }), fileUrl: (value as string) || null };
              } else if (key.startsWith("response_")) {
                const qId = key.slice("response_".length);
                responses[qId] = { ...(responses[qId] ?? { answer: null, fileUrl: null }), answer: (value as string) || null };
              }
            }
            startRegisterTransition(async () => {
              const result = await registerEventAction(eventId, {
                phone: phone || undefined,
                notes: notes || undefined,
                selectedDays: parsedDays,
                responses,
              });
              setState(result);
            });
          }}
          noValidate
        >
            <div className="px-4 pb-2 flex flex-col gap-4">
              {state.error && (
                <Alert variant="destructive">
                  <AlertDescription>{state.error}</AlertDescription>
                </Alert>
              )}

              {/* Details step — hidden (but in DOM) when on a question step */}
              <div hidden={onQuestionStep} className="flex flex-col gap-4">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={userName} disabled className="bg-muted" />
                </div>

                <div className="grid gap-1.5">
                  <Label>Email</Label>
                  <Input value={userEmail} disabled className="bg-muted" />
                </div>

                {showPartialDays && allDays.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label>Which days will you attend?</Label>
                    <div className="flex flex-col gap-2 rounded-xl border px-3 py-3">
                      {allDays.map((day) => (
                        <div key={day} className="flex items-center gap-2.5">
                          <Checkbox
                            id={`day-${day}`}
                            checked={selectedDays.includes(day)}
                            onCheckedChange={() => toggleDay(day)}
                            disabled={isPending}
                          />
                          <Label htmlFor={`day-${day}`} className="text-sm font-normal cursor-pointer">
                            {formatDayLabel(day)}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="selectedDays"
                      value={JSON.stringify(selectedDays)}
                    />
                  </div>
                )}

                {collectPhone && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="phone">Phone number</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+44 7700 000000" disabled={isPending} />
                  </div>
                )}

                {collectNotes && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="notes">Dietary / accessibility needs</Label>
                    <Textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      placeholder="Let us know if you have any requirements..."
                      disabled={isPending}
                    />
                  </div>
                )}
              </div>

              {/* Questions — always in DOM so FormData captures all answers on submit */}
              {hasQuestions && (
                <div hidden={!onQuestionStep}>
                  <QuestionsForm
                    questions={questions!}
                    control={control}
                    disabled={isPending}
                    activeIndex={onQuestionStep ? (step as number) : undefined}
                  />
                </div>
              )}
            </div>

            <DrawerFooter>
              {/* Details step footer */}
              {!onQuestionStep && (
                <>
                  {isRegistered && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleUnregister}
                      disabled={unattendPending}
                      className="w-full"
                    >
                      {unattendPending ? "Cancelling..." : "Cancel Registration"}
                    </Button>
                  )}
                  <DrawerClose asChild>
                    <Button type="button" variant="outline" className="w-full">Close</Button>
                  </DrawerClose>
                  {hasQuestions ? (
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={showPartialDays ? selectedDays.length === 0 : false}
                      className="w-full"
                    >
                      Continue
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isPending || (showPartialDays ? selectedDays.length === 0 : false)}
                    >
                      {getSubmitLabel(isPending)}
                    </Button>
                  )}
                  {showPartialDays && selectedDays.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Please select at least one day to attend.
                    </p>
                  )}
                </>
              )}

              {/* Question step footer */}
              {onQuestionStep && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={goBack}
                    disabled={isPending}
                    className="flex-1"
                  >
                    <ChevronLeft className="size-4 mr-1" />
                    Back
                  </Button>
                  {isLastQuestion ? (
                    <Button type="submit" disabled={isPending} className="flex-1">
                      {getSubmitLabel(isPending)}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={goNext}
                      disabled={isPending}
                      className="flex-1"
                    >
                      Next
                      <ChevronRight className="size-4 ml-1" />
                    </Button>
                  )}
                </div>
              )}
            </DrawerFooter>
          </form>
        )}
      </DrawerContent>
    </Drawer>
  );
}
