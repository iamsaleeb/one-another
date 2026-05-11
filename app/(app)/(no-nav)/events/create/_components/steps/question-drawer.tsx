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
import { Label } from "@/components/ui/label";
import { LibraryDrawer } from "./library-drawer";
import { QuestionType, questionSchema, TYPE_LABELS, type QuestionInput, type LibraryItem } from "@/lib/validations/questions";

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
  const [type, setType] = useState<QuestionType>(initial?.type ?? QuestionType.SHORT_TEXT);
  const [required, setRequired] = useState(initial?.required ?? false);
  const [options, setOptions] = useState<string[]>(
    initial?.options?.length ? initial.options : [""]
  );
  const [libraryItemId, setLibraryItemId] = useState<string | undefined>(initial?.libraryItemId);
  const [libraryOpen, setLibraryOpen] = useState(false);

  function handleLibrarySelect(item: LibraryItem) {
    setLabel(item.label);
    setType(item.type);
    setOptions(item.options.length ? item.options : [""]);
    setLibraryItemId(item.id);
  }

  const validOptions = options.filter((o) => o.trim().length > 0);
  const canSave =
    questionSchema.safeParse({
      type,
      label: label.trim(),
      options: type === QuestionType.MULTIPLE_CHOICE ? validOptions : [],
      required,
      order: 0,
    }).success && (type !== QuestionType.MULTIPLE_CHOICE || validOptions.length >= 1);

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
            <DrawerTitle>{initial ? "Edit question" : "Add question"}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto pb-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setLibraryOpen(true)}
            >
              Pick from library
            </Button>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-label">Question</Label>
              <Input
                id="q-label"
                placeholder="e.g. Do you have any dietary requirements?"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="q-type">Answer type</Label>
              <Select value={type} onValueChange={(v) => setType(v as QuestionType)}>
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
            </div>

            {type === QuestionType.MULTIPLE_CHOICE && (
              <div className="flex flex-col gap-2">
                <Label>Options</Label>
                {options.map((opt, i) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <div key={i} className="flex gap-2">
                    <Input
                      placeholder={`Option ${i + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[i] = e.target.value;
                        setOptions(next);
                      }}
                    />
                    {options.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-10 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => setOptions(options.filter((_, j) => j !== i))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setOptions([...options, ""])}
                >
                  <Plus className="size-4 mr-1" />
                  Add option
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3 min-h-[56px]">
              <div>
                <p className="text-sm font-medium">Required</p>
                <p className="text-xs text-muted-foreground">Attendee must answer this question</p>
              </div>
              <Switch
                checked={required}
                onCheckedChange={setRequired}
              />
            </div>
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
              <Button variant="outline" className="w-full">Cancel</Button>
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
