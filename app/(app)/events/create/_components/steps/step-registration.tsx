"use client";

import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { PriceInput } from "@/components/ui/price-input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { CreateEventInput } from "@/lib/validations/event";

export function StepRegistration() {
  const form = useFormContext<CreateEventInput>();

  const requiresRegistration = useWatch({ control: form.control, name: "requiresRegistration" });
  const tag = useWatch({ control: form.control, name: "tag" });
  const isCamp = tag === "Camp";

  useEffect(() => {
    if (isCamp) form.setValue("requiresRegistration", true);
  }, [isCamp, form]);

  return (
    <div className="flex flex-col gap-5">
      <FormField
        control={form.control}
        name="price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Price (optional)</FormLabel>
            <FormControl>
              <PriceInput {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="requiresRegistration"
        render={({ field }) => (
          <FormItem className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Requires Registration</p>
              <p className="text-xs text-muted-foreground">
                {isCamp ? "Required for camps" : "Attendees must fill in a registration form"}
              </p>
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                onCheckedChange={field.onChange}
                disabled={isCamp}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {requiresRegistration && (
        <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
          <p className="text-sm font-medium">Registration options</p>

          <FormField
            control={form.control}
            name="capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Spots available (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="collectPhone"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Ask for phone number</p>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="collectNotes"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">Ask for dietary / accessibility needs</p>
                <FormControl>
                  <Switch
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
