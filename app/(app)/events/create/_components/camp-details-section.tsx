"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateEventInput } from "@/lib/validations/event";

interface CampDetailsSectionProps {
  form: UseFormReturn<CreateEventInput>;
  startDate?: string;
}

export function CampDetailsSection({ form, startDate }: CampDetailsSectionProps) {
  const { isSubmitting } = form.formState;
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "campAgenda",
  });

  return (
    <div className="flex flex-col gap-4 rounded-2xl border-2 border-primary/20 bg-primary/5 px-4 py-4">
      <p className="text-sm font-semibold text-primary">Camp Details</p>

      <FormField
        control={form.control}
        name="campEndDate"
        render={({ field }) => (
          <FormItem>
            <FormLabel>End Date</FormLabel>
            <FormControl>
              <Input
                type="date"
                disabled={isSubmitting}
                min={startDate ?? undefined}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="campAllowPartialRegistration"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-3 rounded-xl border bg-white px-4 py-3">
            <div>
              <p className="text-sm font-medium">Allow Partial Attendance</p>
              <p className="text-xs text-muted-foreground">Let attendees choose which days to attend</p>
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={isSubmitting}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Agenda builder */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium">Schedule / Agenda</p>

        {fields.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            No agenda items yet. Add items to show attendees what&apos;s planned.
          </p>
        )}

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex flex-col gap-2 rounded-xl border bg-white px-3 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">Item {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 text-destructive hover:text-destructive"
                onClick={() => remove(index)}
                disabled={isSubmitting}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <FormField
                control={form.control}
                name={`campAgenda.${index}.date`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Date</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        disabled={isSubmitting}
                        min={startDate ?? undefined}
                        {...f}
                        value={f.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`campAgenda.${index}.time`}
                render={({ field: f }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Time (optional)</FormLabel>
                    <FormControl>
                      <Input type="time" disabled={isSubmitting} {...f} value={f.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={`campAgenda.${index}.title`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs">Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Morning worship" disabled={isSubmitting} {...f} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`campAgenda.${index}.description`}
              render={({ field: f }) => (
                <FormItem>
                  <FormLabel className="text-xs">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={2} disabled={isSubmitting} {...f} value={f.value ?? ""} />
                  </FormControl>
                  <FormMessage />
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
          onClick={() =>
            append({
              id: crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
              date: startDate ?? "",
              time: undefined,
              title: "",
              description: undefined,
            })
          }
          disabled={isSubmitting}
        >
          <Plus className="size-4 mr-1" />
          Add Agenda Item
        </Button>
      </div>
    </div>
  );
}
