"use client";

import { useRef, useState } from "react";
import { type Control, Controller } from "react-hook-form";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { QuestionType, type Question } from "@/domains/events/questions/validations";
import { type RegistrationFormValues } from "@/domains/events/validations/event";

interface QuestionsFormProps {
  questions: Question[];
  control: Control<RegistrationFormValues>;
  activeIndex?: number;
  disabled?: boolean;
}

interface UploadState {
  uploading: boolean;
  name?: string;
  error?: string;
}

export function QuestionsForm({
  questions,
  control,
  activeIndex,
  disabled,
}: QuestionsFormProps) {
  const [uploadState, setUploadState] = useState<Record<string, UploadState>>(
    {}
  );
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(
    questionId: string,
    file: File,
    onChange: (url: string | null) => void
  ) {
    if (file.size > 10 * 1024 * 1024) {
      setUploadState((prev) => ({
        ...prev,
        [questionId]: { uploading: false, error: "File must be 10MB or less." },
      }));
      return;
    }
    setUploadState((prev) => ({ ...prev, [questionId]: { uploading: true } }));
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: "response",
      });
      onChange(blob.url);
      setUploadState((prev) => ({
        ...prev,
        [questionId]: { uploading: false, name: file.name },
      }));
    } catch {
      setUploadState((prev) => ({
        ...prev,
        [questionId]: {
          uploading: false,
          error: "Upload failed. Please try again.",
        },
      }));
    }
  }

  const labelClass =
    activeIndex !== undefined ? "text-xl font-semibold" : "text-sm font-medium";

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q, index) => {
        if (activeIndex !== undefined && index !== activeIndex) return null;

        return (
          <div key={q.id} className="flex flex-col gap-3">
            <Label className={labelClass}>
              {q.label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {q.type === QuestionType.SHORT_TEXT && (
              <Controller
                control={control}
                name={`responses.${q.id}.answer`}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      placeholder="Your answer..."
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-xs">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            )}

            {q.type === QuestionType.LONG_TEXT && (
              <Controller
                control={control}
                name={`responses.${q.id}.answer`}
                render={({ field, fieldState }) => (
                  <>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      disabled={disabled}
                      rows={3}
                      placeholder="Your answer..."
                    />
                    {fieldState.error && (
                      <p className="text-destructive text-xs">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            )}

            {q.type === QuestionType.YES_NO && (
              <Controller
                control={control}
                name={`responses.${q.id}.answer`}
                render={({ field, fieldState }) => (
                  <>
                    <div className="bg-background flex min-h-[56px] items-center justify-between gap-3 rounded-xl border px-4 py-3">
                      <span className="text-muted-foreground text-sm">
                        {field.value === "true"
                          ? "Yes"
                          : field.value === "false"
                            ? "No"
                            : "—"}
                      </span>
                      <Switch
                        checked={field.value === "true"}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? "true" : "false")
                        }
                      />
                    </div>
                    {fieldState.error && (
                      <p className="text-destructive text-xs">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            )}

            {q.type === QuestionType.MULTIPLE_CHOICE && (
              <Controller
                control={control}
                name={`responses.${q.id}.answer`}
                render={({ field, fieldState }) => (
                  <>
                    <RadioGroup
                      value={field.value ?? undefined}
                      onValueChange={field.onChange}
                      disabled={disabled}
                      className="flex flex-col gap-2"
                    >
                      {q.options.map((opt) => (
                        <div
                          key={opt}
                          className="flex min-h-[44px] items-center gap-2.5"
                        >
                          <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                          <Label
                            htmlFor={`${q.id}-${opt}`}
                            className="cursor-pointer text-sm font-normal"
                          >
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {fieldState.error && (
                      <p className="text-destructive text-xs">
                        {fieldState.error.message}
                      </p>
                    )}
                  </>
                )}
              />
            )}

            {q.type === QuestionType.FILE_UPLOAD && (
              <Controller
                control={control}
                name={`responses.${q.id}.fileUrl`}
                render={({ field, fieldState }) => {
                  const state = uploadState[q.id];
                  return (
                    <div className="flex flex-col gap-1.5">
                      <input
                        ref={(el) => {
                          inputRefs.current[q.id] = el;
                        }}
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file)
                            handleFileSelect(q.id, file, field.onChange);
                          e.target.value = "";
                        }}
                      />
                      {field.value ? (
                        <div className="bg-background flex items-center gap-2 rounded-xl border px-4 py-3">
                          <Paperclip className="text-muted-foreground size-4 shrink-0" />
                          <span className="flex-1 truncate text-sm">
                            {state?.name ?? "Uploaded file"}
                          </span>
                          {!disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0"
                              onClick={() => {
                                field.onChange(null);
                                setUploadState((prev) => {
                                  const next = { ...prev };
                                  delete next[q.id];
                                  return next;
                                });
                              }}
                            >
                              <X className="size-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={state?.uploading || disabled}
                          onClick={() => inputRefs.current[q.id]?.click()}
                        >
                          <Paperclip className="mr-2 size-4" />
                          {state?.uploading ? "Uploading..." : "Attach file"}
                        </Button>
                      )}
                      {state?.error && (
                        <p className="text-destructive text-xs">
                          {state.error}
                        </p>
                      )}
                      {fieldState.error && (
                        <p className="text-destructive text-xs">
                          {fieldState.error.message}
                        </p>
                      )}
                    </div>
                  );
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
