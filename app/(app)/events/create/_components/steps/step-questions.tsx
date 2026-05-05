// app/(app)/events/create/_components/steps/step-questions.tsx
"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { ChevronUp, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
} from "@/components/ui/form";
import { QuestionDrawer } from "./question-drawer";
import type { QuestionType, QuestionInput } from "@/lib/validations/questions";
import type { CreateEventInput } from "@/lib/validations/event";

const TYPE_LABELS: Record<QuestionType, string> = {
  SHORT_TEXT: "Short text",
  LONG_TEXT: "Long text",
  YES_NO: "Yes / No",
  MULTIPLE_CHOICE: "Multiple choice",
  FILE_UPLOAD: "File upload",
};

interface StepQuestionsProps {
  libraryItems: Array<{ id: string; type: QuestionType; label: string; options: string[] }>;
}

export function StepQuestions({ libraryItems }: StepQuestionsProps) {
  const form = useFormContext<CreateEventInput>();
  const { fields, append, remove, update, move } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [drawerKey, setDrawerKey] = useState(0);

  function handleSave(q: Omit<QuestionInput, "order">) {
    if (editingIndex !== null) {
      update(editingIndex, { ...q, order: editingIndex });
    } else {
      append({ ...q, order: fields.length });
    }
    setEditingIndex(null);
  }

  function openEdit(index: number) {
    setEditingIndex(index);
    setDrawerKey((k) => k + 1);
    setDrawerOpen(true);
  }

  function openAdd() {
    setEditingIndex(null);
    setDrawerKey((k) => k + 1);
    setDrawerOpen(true);
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 py-4">
      <p className="text-sm font-semibold text-primary">Custom Questions</p>
      <p className="text-xs text-muted-foreground">
        Questions will be shown to attendees when they sign up or confirm attendance.
      </p>

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No questions added yet.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex flex-col gap-2 rounded-xl border bg-white px-3 py-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2">{field.label}</p>
              <div className="flex items-center gap-1.5">
                <Badge variant="secondary" className="text-xs">
                  {TYPE_LABELS[field.type as QuestionType]}
                </Badge>
                {field.required && (
                  <Badge variant="outline" className="text-xs">Required</Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
                aria-label="Move up"
              >
                <ChevronUp className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
                aria-label="Move down"
              >
                <ChevronDown className="size-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => openEdit(index)}
                aria-label="Edit question"
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
                aria-label="Delete question"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name={`questions.${index}.required`}
            render={({ field: f }) => (
              <FormItem className="flex items-center justify-between gap-2 pt-1">
                <p className="text-xs text-muted-foreground">Required</p>
                <FormControl>
                  <Switch
                    checked={f.value ?? false}
                    onCheckedChange={f.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={openAdd}
      >
        <Plus className="size-4 mr-1" />
        Add question
      </Button>

      <QuestionDrawer
        key={drawerKey}
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditingIndex(null);
        }}
        initial={editingIndex !== null ? (fields[editingIndex] as QuestionInput) : null}
        libraryItems={libraryItems}
        onSave={handleSave}
      />
    </div>
  );
}
