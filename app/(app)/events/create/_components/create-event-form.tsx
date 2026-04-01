"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PriceInput } from "@/components/ui/price-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { createEventAction } from "@/lib/actions/events";
import { PhotoUploadField } from "@/components/photo-upload-field";

const CATEGORIES = [
  "Worship",
  "Prayer",
  "Youth",
  "Outreach",
  "Bible Study",
  "Missions",
];

interface Church { id: string; name: string }
interface Series { id: string; name: string; churchId: string; churchName: string }

export function CreateEventForm({
  churches,
  series,
}: {
  churches: Church[];
  series?: Series;
}) {
  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      date: "",
      time: "",
      location: "",
      host: "",
      tag: "",
      description: "",
      churchId: series?.churchId ?? "",
      seriesId: series?.id ?? undefined,
      requiresRegistration: false,
      capacity: undefined,
      collectPhone: false,
      collectNotes: false,
      price: undefined,
      isDraft: false,
      photoUrl: undefined,
    },
  });

  const { isSubmitting } = form.formState;
  const requiresRegistration = useWatch({ control: form.control, name: "requiresRegistration" });

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await createEventAction(data);
    if (result?.error) {
      form.setValue("isDraft", false);
      form.setError("root", { message: result.error });
    }
    if (result?.fieldErrors) {
      form.setValue("isDraft", false);
      Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
        form.setError(field as keyof CreateEventInput, { message: msgs[0] })
      );
    }
  });

  const onSaveAsDraft = () => {
    form.setValue("isDraft", true);
    onSubmit();
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {series && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5">
            <Repeat className="size-4 text-primary shrink-0" />
            <p className="text-sm text-primary font-medium">
              Session for: {series.name}
            </p>
          </div>
        )}

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
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
                <Input disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <FormControl>
                  <Input type="time" disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input disabled={isSubmitting} {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
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

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea rows={4} disabled={isSubmitting} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (optional)</FormLabel>
              <FormControl>
                <PriceInput disabled={isSubmitting} {...field} />
              </FormControl>
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
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

        <FormField
          control={form.control}
          name="requiresRegistration"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Requires Registration</p>
                <p className="text-xs text-muted-foreground">Attendees must fill in a registration form</p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
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
                      disabled={isSubmitting}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
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
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : series ? "Add Session" : "Create Event"}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={isSubmitting} onClick={onSaveAsDraft}>
            Save as Draft
          </Button>
        </div>
      </form>
    </Form>
  );
}
