// app/(app)/events/create/_components/steps/question-drawer.tsx
"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerClose,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { LibraryDrawer } from "./library-drawer";
import {
  QuestionType,
  questionSchema,
  TYPE_LABELS,
  type QuestionInput,
  type LibraryItem,
} from "@/domains/events/questions/validations";

interface QuestionDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: QuestionInput | null;
  libraryItems: LibraryItem[];
  onSave: (question: Omit<QuestionInput, "order">) => void;
}

export function QuestionDrawer({
  open,
  onOpenChange,
  initial,
  libraryItems,
  onSave,
}: QuestionDrawerProps) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [type, setType] = useState<QuestionType>(
    initial?.type ?? QuestionType.SHORT_TEXT
  );
  const [required, setRequired] = useState(initial?.required ?? false);
  const [options, setOptions] = useState<Array<{ id: string; value: string }>>(
    (initial?.options?.length ? initial.options : [""]).map((value) => ({
      id: crypto.randomUUID(),
      value,
    }))
  );
  const [libraryItemId, setLibraryItemId] = useState<string | undefined>(
    initial?.libraryItemId
  );
  const [libraryOpen, setLibraryOpen] = useState(false);

  function handleLibrarySelect(item: LibraryItem) {
    setLabel(item.label);
    setType(item.type);
    setOptions(
      (item.options.length ? item.options : [""]).map((value) => ({
        id: crypto.randomUUID(),
        value,
      }))
    );
    setLibraryItemId(item.id);
  }

  const validOptions = options
    .map((o) => o.value)
    .filter((v) => v.trim().length > 0);
  const canSave =
    questionSchema.safeParse({
      type,
      label: label.trim(),
      options: type === QuestionType.MULTIPLE_CHOICE ? validOptions : [],
      required,
      order: 0,
    }).success &&
    (type !== QuestionType.MULTIPLE_CHOICE || validOptions.length >= 1);

  function handleSave() {
    if (!canSave) return;
    onSave({
      id: initial?.id,
      type,
      label: label.trim(),
      options: type === QuestionType.MULTIPLE_CHOICE ? validOptions : [],
      required,
      libraryItemId,
    });

    onOpenChange(false);
  }

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent aria-describedby={undefined}>
          <DrawerHeader>
            <DrawerTitle>
              {initial ? "Edit question" : "Add question"}
            </DrawerTitle>
          </DrawerHeader>

          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-4 pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLibraryOpen(true)}
            >
              Pick from library
            </Button>

            <Field>
              <FieldLabel htmlFor="q-label">Question</FieldLabel>
              <Input
                id="q-label"
                placeholder="e.g. Do you have any dietary requirements?"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="q-type">Answer type</FieldLabel>
              <Select
                value={type}
                onValueChange={(v) => setType(v as QuestionType)}
              >
                <SelectTrigger id="q-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {type === QuestionType.MULTIPLE_CHOICE && (
              <FieldSet className="gap-2">
                <FieldLegend variant="label" className="mb-1">
                  Options
                </FieldLegend>
                {options.map((opt, i) => (
                  <InputGroup key={opt.id}>
                    <InputGroupInput
                      aria-label={`Option ${i + 1}`}
                      placeholder={`Option ${i + 1}`}
                      value={opt.value}
                      onChange={(e) =>
                        setOptions(
                          options.map((o) =>
                            o.id === opt.id
                              ? { ...o, value: e.target.value }
                              : o
                          )
                        )
                      }
                    />
                    {options.length > 1 && (
                      <InputGroupAddon align="inline-end">
                        <InputGroupButton
                          size="icon-xs"
                          aria-label={`Remove option ${i + 1}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() =>
                            setOptions(options.filter((o) => o.id !== opt.id))
                          }
                        >
                          <Trash2 />
                        </InputGroupButton>
                      </InputGroupAddon>
                    )}
                  </InputGroup>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() =>
                    setOptions([
                      ...options,
                      { id: crypto.randomUUID(), value: "" },
                    ])
                  }
                >
                  <Plus />
                  Add option
                </Button>
              </FieldSet>
            )}

            <Field
              orientation="horizontal"
              className="bg-background min-h-[56px] justify-between rounded-xl border px-4 py-3"
            >
              <FieldContent className="gap-0.5">
                <FieldLabel htmlFor="q-required">Required</FieldLabel>
                <FieldDescription className="text-xs">
                  Attendee must answer this question
                </FieldDescription>
              </FieldContent>
              <Switch
                id="q-required"
                checked={required}
                onCheckedChange={setRequired}
              />
            </Field>
          </div>

          <DrawerFooter>
            <Button
              type="button"
              className="w-full"
              onClick={handleSave}
              disabled={!canSave}
            >
              {initial ? "Save changes" : "Add question"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <LibraryDrawer
        open={libraryOpen}
        onOpenChange={setLibraryOpen}
        items={libraryItems}
        onSelect={handleLibrarySelect}
      />
    </>
  );
}
