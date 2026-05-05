// app/(app)/events/[id]/_components/questions-form.tsx
"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Paperclip, X } from "lucide-react";
import { QuestionType } from "@/lib/validations/questions";

interface Question {
  id: string;
  type: string;
  label: string;
  options: string[];
  required: boolean;
}

interface QuestionsFormProps {
  questions: Question[];
  defaultResponses?: Record<string, { answer: string | null; fileUrl: string | null }>;
  disabled?: boolean;
}

export function QuestionsForm({ questions, defaultResponses = {}, disabled }: QuestionsFormProps) {
  // Controlled state for YES_NO switches so hidden inputs stay in sync with FormData
  const [switchValues, setSwitchValues] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const q of questions) {
      if (q.type === QuestionType.YES_NO) {
        initial[q.id] = defaultResponses[q.id]?.answer === "true";
      }
    }
    return initial;
  });

  const [fileUrls, setFileUrls] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const q of questions) {
      const existing = defaultResponses[q.id]?.fileUrl;
      if (existing) initial[q.id] = existing;
    }
    return initial;
  });
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleFileSelect(questionId: string, file: File) {
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
      setFileUrls((prev) => ({ ...prev, [questionId]: blob.url }));
      setFileNames((prev) => ({ ...prev, [questionId]: file.name }));
    } catch {
      setFileErrors((prev) => ({ ...prev, [questionId]: "Upload failed. Please try again." }));
    } finally {
      setUploading((prev) => ({ ...prev, [questionId]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {questions.map((q) => {
        const defaultAnswer = defaultResponses[q.id]?.answer ?? undefined;

        return (
          <div key={q.id} className="flex flex-col gap-1.5">
            <Label className="text-sm font-medium">
              {q.label}
              {q.required && <span className="text-destructive ml-1">*</span>}
            </Label>

            {q.type === QuestionType.SHORT_TEXT && (
              <Input
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? ""}
                required={q.required}
                disabled={disabled}
                placeholder="Your answer..."
              />
            )}

            {q.type === QuestionType.LONG_TEXT && (
              <Textarea
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? ""}
                required={q.required}
                disabled={disabled}
                rows={3}
                placeholder="Your answer..."
              />
            )}

            {q.type === QuestionType.YES_NO && (
              <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 min-h-[56px]">
                <span className="text-sm text-muted-foreground">
                  {switchValues[q.id] ? "Yes" : "No"}
                </span>
                <Switch
                  checked={switchValues[q.id] ?? false}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    setSwitchValues((prev) => ({ ...prev, [q.id]: checked }))
                  }
                />
                {/* Hidden input carries the switch value through FormData */}
                <input
                  type="hidden"
                  name={`response_${q.id}`}
                  value={switchValues[q.id] ? "true" : "false"}
                />
              </div>
            )}

            {q.type === QuestionType.MULTIPLE_CHOICE && (
              <RadioGroup
                name={`response_${q.id}`}
                defaultValue={defaultAnswer ?? undefined}
                required={q.required}
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
            )}

            {q.type === QuestionType.FILE_UPLOAD && (
              <div className="flex flex-col gap-1.5">
                {/* sr-only input lets browser enforce required on file upload questions */}
                <input
                  className="sr-only"
                  aria-hidden
                  tabIndex={-1}
                  value={fileUrls[q.id] ?? ""}
                  onChange={() => undefined}
                  required={q.required}
                />
                <input
                  ref={(el) => { inputRefs.current[q.id] = el; }}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(q.id, file);
                    e.target.value = "";
                  }}
                />
                {fileUrls[q.id] ? (
                  <div className="flex items-center gap-2 rounded-xl border bg-background px-4 py-3">
                    <Paperclip className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm flex-1 truncate">{fileNames[q.id] ?? "Uploaded file"}</span>
                    {!disabled && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0"
                        onClick={() => {
                          setFileUrls((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                          setFileNames((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                        }}
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                    <input type="hidden" name={`response_file_${q.id}`} value={fileUrls[q.id]} />
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
