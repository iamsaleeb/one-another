"use client";

import { useRef, useState } from "react";
import { type Control, Controller } from "react-hook-form";
import { upload } from "@vercel/blob/client";
import { useSession } from "next-auth/react";
import { uploadPathname } from "@/domains/upload/lib/paths";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { cn } from "@/lib/utils";
import { Paperclip, X } from "lucide-react";
import {
  QuestionType,
  type Question,
} from "@/domains/events/questions/validations";
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
  const userId = useSession().data?.user?.id;
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
      if (!userId) throw new Error("Not signed in");
      const blob = await upload(
        uploadPathname("response", userId, file.name),
        file,
        {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: "response",
        }
      );
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
          <Field key={q.id}>
            <FieldLabel
              id={`q-${q.id}-label`}
              htmlFor={`q-${q.id}`}
              className={cn("block", labelClass)}
            >
              {q.label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </FieldLabel>

            {q.type === QuestionType.SHORT_TEXT && (
              <Controller
                control={control}
                name={`responses.${q.id}.answer`}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id={`q-${q.id}`}
                      aria-invalid={fieldState.invalid}
                      value={field.value ?? ""}
                      disabled={disabled}
                      placeholder="Your answer..."
                    />
                    <FieldError errors={[fieldState.error]} />
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
                      id={`q-${q.id}`}
                      aria-invalid={fieldState.invalid}
                      value={field.value ?? ""}
                      disabled={disabled}
                      rows={3}
                      placeholder="Your answer..."
                    />
                    <FieldError errors={[fieldState.error]} />
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
                    <Field
                      orientation="horizontal"
                      className="bg-background min-h-[56px] justify-between rounded-xl border px-4 py-3"
                    >
                      <span className="text-muted-foreground text-sm">
                        {field.value === "true"
                          ? "Yes"
                          : field.value === "false"
                            ? "No"
                            : "—"}
                      </span>
                      <Switch
                        id={`q-${q.id}`}
                        aria-invalid={fieldState.invalid}
                        checked={field.value === "true"}
                        disabled={disabled}
                        onCheckedChange={(checked) =>
                          field.onChange(checked ? "true" : "false")
                        }
                      />
                    </Field>
                    <FieldError errors={[fieldState.error]} />
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
                      aria-labelledby={`q-${q.id}-label`}
                      aria-invalid={fieldState.invalid}
                      className="flex flex-col gap-2"
                    >
                      {q.options.map((opt) => (
                        <Field
                          key={opt}
                          orientation="horizontal"
                          className="min-h-[44px]"
                        >
                          <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                          <FieldLabel
                            htmlFor={`${q.id}-${opt}`}
                            className="font-normal"
                          >
                            {opt}
                          </FieldLabel>
                        </Field>
                      ))}
                    </RadioGroup>
                    <FieldError errors={[fieldState.error]} />
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
                        id={`q-${q.id}`}
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
                        <Item
                          variant="outline"
                          size="sm"
                          className="bg-background flex-nowrap gap-2 rounded-xl"
                        >
                          <ItemMedia>
                            <Paperclip className="text-muted-foreground size-4" />
                          </ItemMedia>
                          <ItemContent className="min-w-0">
                            <ItemTitle className="w-full truncate font-normal">
                              {state?.name ?? "Uploaded file"}
                            </ItemTitle>
                          </ItemContent>
                          {!disabled && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label="Remove file"
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
                        </Item>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={state?.uploading || disabled}
                          onClick={() => inputRefs.current[q.id]?.click()}
                        >
                          <Paperclip />
                          {state?.uploading ? "Uploading..." : "Attach file"}
                        </Button>
                      )}
                      {state?.error && <FieldError>{state.error}</FieldError>}
                      <FieldError errors={[fieldState.error]} />
                    </div>
                  );
                }}
              />
            )}
          </Field>
        );
      })}
    </div>
  );
}
