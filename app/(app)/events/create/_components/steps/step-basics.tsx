"use client";

import { useFormContext } from "react-hook-form";
import { Repeat } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { CATEGORY_OPTIONS } from "@/types/search";
import type { CreateEventInput } from "@/lib/validations/event";

interface StepBasicsProps {
  churches: { id: string; name: string }[];
  series?: { id: string; name: string; churchId: string; churchName: string } | null;
}

export function StepBasics({ churches, series }: StepBasicsProps) {
  const form = useFormContext<CreateEventInput>();
  const { isSubmitting } = form.formState;

  return (
    <div className="flex flex-col gap-5">
      {series && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5">
          <Repeat className="size-4 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            Session for: {series.name}
          </p>
        </div>
      )}

      <FormField
        control={form.control}
        name="photoUrl"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Cover Photo (optional)</FormLabel>
            <FormControl>
              <PhotoUploadField value={field.value} onChange={field.onChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Title</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g. Sunday Evening Worship"
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                rows={4}
                placeholder="e.g. Join us for an evening of worship, prayer and community. All are welcome."
                disabled={isSubmitting}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tag"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select
              onValueChange={field.onChange}
              defaultValue={field.value}
              disabled={isSubmitting}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {CATEGORY_OPTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {series ? (
        <div className="grid gap-1.5">
          <FormLabel>Church</FormLabel>
          <Select value={series.churchId} disabled>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={series.churchId}>{series.churchName}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : (
        <FormField
          control={form.control}
          name="churchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Church</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a church" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {churches.map((church) => (
                    <SelectItem key={church.id} value={church.id}>
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
