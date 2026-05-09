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
import { QuestionType, type Question } from "@/lib/validations/questions";
import { type RegistrationFormValues } from "@/lib/validations/event";

interface QuestionsFormProps {
  questions: Question[];
  control: Control<RegistrationFormValues>;
  activeIndex?: number;
  disabled?: boolean;
}

export function QuestionsForm({ questions, control, activeIndex, disabled }: QuestionsFormProps) {
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(
    questionId: string,
    file: File,
    onChange: (url: string | null) => void
  ) {
    if (file.size > 10 * 1024 * 1024) {
      setFileErrors((prev) => ({ ...prev, [questionId]: "File must be 10MB or less." }));
      return;
    }
    setFileErrors((prev) => ({ ...prev, [questionId]: "" }));
    setUploading((prev) => ({ ...prev, [questionId]: true }));
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: "response",
      });
      onChange(blob.url);
      setFileNames((prev) => ({ ...prev, [questionId]: file.name }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [questionId]: "Upload failed. Please try again." }));
    } finally {
      setUploading((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  const labelClass = activeIndex !== undefined ? "text-xl font-semibold" : "text-sm font-medium";

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
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
                    <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 min-h-[56px]">
                      <span className="text-sm text-muted-foreground">
                        {field.value === "true" ? "Yes" : field.value === "false" ? "No" : "—"}
                      </span>
                      <Switch
                        checked={field.value === "true"}
                        disabled={disabled}
                        onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                      />
                    </div>
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
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
                        <div key={opt} className="flex items-center gap-2.5 min-h-[44px]">
                          <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                          <Label htmlFor={`${q.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                            {opt}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            )}

            {q.type === QuestionType.FILE_UPLOAD && (
              <Controller
                control={control}
                name={`responses.${q.id}.fileUrl`}
                render={({ field, fieldState }) => (
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={(el) => { inputRefs.current[q.id] = el; }}
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(q.id, file, field.onChange);
                        e.target.value = "";
                      }}
                    />
                    {field.value ? (
                      <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3">
                        <Paperclip className="size-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1 truncate">
                          {fileNames[q.id] ?? "Uploaded file"}
                        </span>
                        {!disabled && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => {
                              field.onChange(null);
                              setFileNames((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
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
                        disabled={uploading[q.id] || disabled}
                        onClick={() => inputRefs.current[q.id]?.click()}
                      >
                        <Paperclip className="size-4 mr-2" />
                        {uploading[q.id] ? "Uploading..." : "Attach file"}
                      </Button>
                    )}
                    {fileErrors[q.id] && (
                      <p className="text-xs text-destructive">{fileErrors[q.id]}</p>
                    )}
                    {fieldState.error && (
                      <p className="text-xs text-destructive">{fieldState.error.message}</p>
                    )}
                  </div>
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
