"use client";

import { useForm, useWatch } from "react-hook-form";
import { useTransition } from "react";
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
import { updateEventAction, publishEventAction, unpublishEventAction } from "@/lib/actions/events";
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

interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  host: string;
  tag: string;
  description: string;
  churchId?: string | null;
  seriesId?: string | null;
  seriesName?: string | null;
  photoUrl?: string | null;
  requiresRegistration: boolean;
  capacity?: number | null;
  collectPhone: boolean;
  collectNotes: boolean;
  price?: string | null;
  isDraft: boolean;
}

export function EditEventForm({
  event,
  churches,
}: {
  event: EventData;
  churches: Church[];
}) {
  const form = useForm<CreateEventInput>({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      host: event.host,
      tag: event.tag,
      description: event.description,
      churchId: event.churchId ?? "",
      seriesId: event.seriesId ?? undefined,
      requiresRegistration: event.requiresRegistration,
      capacity: event.capacity ?? undefined,
      collectPhone: event.collectPhone,
      collectNotes: event.collectNotes,
      price: event.price ?? undefined,
      photoUrl: event.photoUrl ?? undefined,
    },
  });

  const { isSubmitting } = form.formState;
  const [isPublishPending, startPublishTransition] = useTransition();
  const requiresRegistration = useWatch({ control: form.control, name: "requiresRegistration" });

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await updateEventAction(event.id, data);
    if (result?.error) {
      form.setError("root", { message: result.error });
    }
    if (result?.fieldErrors) {
      Object.entries(result.fieldErrors).forEach(([field, msgs]) =>
        form.setError(field as keyof CreateEventInput, { message: msgs[0] })
      );
    }
  });

  const handlePublish = () => {
    startPublishTransition(async () => {
      const result = await publishEventAction(event.id);
      if (result?.error) form.setError("root", { message: result.error });
    });
  };

  const handleUnpublish = () => {
    startPublishTransition(async () => {
      const result = await unpublishEventAction(event.id);
      if (result?.error) form.setError("root", { message: result.error });
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {event.seriesName && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5">
            <Repeat className="size-4 text-primary shrink-0" />
            <p className="text-sm text-primary font-medium">
              Session for: {event.seriesName}
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

        {event.seriesId ? (
          <div className="grid gap-1.5">
            <FormLabel>Church</FormLabel>
            <Select value={event.churchId ?? ""} disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {event.churchId && (
                  <SelectItem value={event.churchId}>
                    {churches.find((c) => c.id === event.churchId)?.name ?? event.churchId}
                  </SelectItem>
                )}
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

        {event.isDraft ? (
          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isSubmitting || isPublishPending}>
              {isSubmitting ? "Saving..." : "Save Draft"}
            </Button>
            <Button type="button" variant="outline" className="w-full" disabled={isSubmitting || isPublishPending} onClick={handlePublish}>
              {isPublishPending ? "Publishing..." : "Publish Event"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full" disabled={isSubmitting || isPublishPending}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
            <Button type="button" variant="outline" className="w-full text-muted-foreground" disabled={isSubmitting || isPublishPending} onClick={handleUnpublish}>
              {isPublishPending ? "Reverting..." : "Revert to Draft"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
}
