// app/(app)/events/create/_components/steps/question-drawer.tsx
"use client";

import { useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FieldError,
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
  questionFormSchema,
  TYPE_LABELS,
  type QuestionFormInput,
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

const toOptionFields = (options: string[] | undefined) =>
  (options?.length ? options : [""]).map((value) => ({ value }));

export function QuestionDrawer({
  open,
  onOpenChange,
  initial,
  libraryItems,
  onSave,
}: QuestionDrawerProps) {
  const form = useForm<QuestionFormInput>({
    resolver: zodResolver(questionFormSchema),
    mode: "onChange",
    defaultValues: {
      type: initial?.type ?? QuestionType.SHORT_TEXT,
      label: initial?.label ?? "",
      options: toOptionFields(initial?.options),
      required: initial?.required ?? false,
      libraryItemId: initial?.libraryItemId,
    },
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "options",
  });
  const type = useWatch({ control: form.control, name: "type" });
  const [libraryOpen, setLibraryOpen] = useState(false);

  function handleLibrarySelect(item: LibraryItem) {
    form.reset(
      {
        ...form.getValues(),
        type: item.type,
        label: item.label,
        options: toOptionFields(item.options),
        libraryItemId: item.id,
      },
      { keepDefaultValues: true }
    );
    void form.trigger();
  }

  const onSubmit = form.handleSubmit((data) => {
    onSave({
      id: initial?.id,
      type: data.type,
      label: data.label,
      options:
        data.type === QuestionType.MULTIPLE_CHOICE
          ? data.options.map((o) => o.value.trim()).filter(Boolean)
          : [],
      required: data.required,
      libraryItemId: data.libraryItemId,
    });
    onOpenChange(false);
  });

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent aria-describedby={undefined}>
          {/* The drawer is portalled, but React still bubbles its submit
              event up to the event wizard's form, so stop it here. */}
          <form
            noValidate
            className="flex min-h-0 flex-col"
            onSubmit={(e) => {
              e.stopPropagation();
              void onSubmit(e);
            }}
          >
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

              <Controller
                control={form.control}
                name="label"
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="q-label">Question</FieldLabel>
                    <Input
                      id="q-label"
                      aria-invalid={fieldState.invalid}
                      placeholder="e.g. Do you have any dietary requirements?"
                      {...field}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Field>
                    <FieldLabel htmlFor="q-type">Answer type</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />

              {type === QuestionType.MULTIPLE_CHOICE && (
                <FieldSet
                  className="gap-2"
                  data-invalid={!!form.formState.errors.options}
                >
                  <FieldLegend variant="label" className="mb-1">
                    Options
                  </FieldLegend>
                  {fields.map((opt, i) => (
                    <Controller
                      key={opt.id}
                      control={form.control}
                      name={`options.${i}.value`}
                      render={({ field }) => (
                        <InputGroup>
                          <InputGroupInput
                            aria-label={`Option ${i + 1}`}
                            placeholder={`Option ${i + 1}`}
                            {...field}
                          />
                          {fields.length > 1 && (
                            <InputGroupAddon align="inline-end">
                              <InputGroupButton
                                size="icon-xs"
                                aria-label={`Remove option ${i + 1}`}
                                className="text-destructive hover:text-destructive"
                                onClick={() => remove(i)}
                              >
                                <Trash2 />
                              </InputGroupButton>
                            </InputGroupAddon>
                          )}
                        </InputGroup>
                      )}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => append({ value: "" })}
                  >
                    <Plus />
                    Add option
                  </Button>
                  <FieldError errors={[form.formState.errors.options?.root]} />
                </FieldSet>
              )}

              <Controller
                control={form.control}
                name="required"
                render={({ field }) => (
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </Field>
                )}
              />
            </div>

            <DrawerFooter>
              <Button
                type="submit"
                className="w-full"
                disabled={!form.formState.isValid}
              >
                {initial ? "Save changes" : "Add question"}
              </Button>
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </form>
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
