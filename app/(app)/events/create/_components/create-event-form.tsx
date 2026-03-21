"use client";

import { useActionState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createEventAction, type CreateEventState } from "@/lib/actions/events";

const CATEGORIES = [
  "Worship",
  "Prayer",
  "Youth",
  "Outreach",
  "Bible Study",
  "Missions",
];

type Church = { id: string; name: string };
type Series = { id: string; name: string };

export function CreateEventForm({
  churches,
  series,
}: {
  churches: Church[];
  series?: Series;
}) {
  const [state, action, isPending] = useActionState<CreateEventState, FormData>(
    createEventAction,
    {}
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {series && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5">
          <Repeat className="size-4 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            Session for: {series.name}
          </p>
          <input type="hidden" name="seriesId" value={series.id} />
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive text-center">{state.error}</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required disabled={isPending} />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required disabled={isPending} />
          {state.fieldErrors?.date && (
            <p className="text-xs text-destructive">{state.fieldErrors.date[0]}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="time">Time</Label>
          <Input id="time" name="time" type="time" required disabled={isPending} />
          {state.fieldErrors?.time && (
            <p className="text-xs text-destructive">{state.fieldErrors.time[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" required disabled={isPending} />
        {state.fieldErrors?.location && (
          <p className="text-xs text-destructive">{state.fieldErrors.location[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="host">Host</Label>
        <Input id="host" name="host" required disabled={isPending} />
        {state.fieldErrors?.host && (
          <p className="text-xs text-destructive">{state.fieldErrors.host[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tag">Category</Label>
        <Select name="tag" disabled={isPending}>
          <SelectTrigger id="tag">
            <SelectValue placeholder="Select a category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.tag && (
          <p className="text-xs text-destructive">{state.fieldErrors.tag[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          required
          disabled={isPending}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.description[0]}
          </p>
        )}
      </div>

      {churches.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="churchId">Church (optional)</Label>
          <Select name="churchId" disabled={isPending}>
            <SelectTrigger id="churchId">
              <SelectValue placeholder="Select a church" />
            </SelectTrigger>
            <SelectContent>
              {churches.map((church) => (
                <SelectItem key={church.id} value={church.id}>
                  {church.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : series ? "Add Session" : "Create Event"}
      </Button>
    </form>
  );
}
