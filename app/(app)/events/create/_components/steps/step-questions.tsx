// app/(app)/events/create/_components/steps/step-questions.tsx
"use client";

import { useState } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { ChevronUp, ChevronDown, Lock, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuestionDrawer } from "./question-drawer";
import { TYPE_LABELS, type QuestionType, type QuestionInput, type LibraryItem } from "@/lib/validations/questions";
import type { CreateEventInput } from "@/lib/validations/event";

interface StepQuestionsProps {
  libraryItems: LibraryItem[];
  locked?: boolean;
}

export function StepQuestions({ libraryItems, locked }: StepQuestionsProps) {
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
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold">Custom Questions</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Questions will be shown to attendees when they sign up or confirm attendance.
        </p>
      </div>

      {locked && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-amber-700">
          <Lock className="size-4 mt-0.5 shrink-0" />
          <p className="text-xs">
            Questions are locked because attendees have already submitted responses. To change questions, you must first remove all responses.
          </p>
        </div>
      )}

      {fields.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No questions added yet.
        </p>
      )}

      {fields.map((field, index) => (
        <div
          key={field.id}
          className="flex items-start justify-between gap-2 rounded-xl border bg-white px-3 py-3"
        >
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
                disabled={locked || index === 0}
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
                disabled={locked || index === fields.length - 1}
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
                disabled={locked}
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
                disabled={locked}
                onClick={() => remove(index)}
                aria-label="Delete question"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
        </div>
      ))}

      {!locked && (
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
      )}

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
