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
import { updateEventAction, type CreateEventState } from "@/lib/actions/events";

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
}

export function EditEventForm({
  event,
  churches,
}: {
  event: EventData;
  churches: Church[];
}) {
  const boundAction = updateEventAction.bind(null, event.id);
  const [state, action, isPending] = useActionState<CreateEventState, FormData>(
    boundAction,
    {}
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {event.seriesName && (
        <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2.5">
          <Repeat className="size-4 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            Session for: {event.seriesName}
          </p>
          {event.seriesId && <input type="hidden" name="seriesId" value={event.seriesId} />}
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive text-center">{state.error}</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={event.title} required disabled={isPending} />
        {state.fieldErrors?.title && (
          <p className="text-xs text-destructive">{state.fieldErrors.title[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" defaultValue={event.date} required disabled={isPending} />
          {state.fieldErrors?.date && (
            <p className="text-xs text-destructive">{state.fieldErrors.date[0]}</p>
          )}
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="time">Time</Label>
          <Input id="time" name="time" type="time" defaultValue={event.time} required disabled={isPending} />
          {state.fieldErrors?.time && (
            <p className="text-xs text-destructive">{state.fieldErrors.time[0]}</p>
          )}
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={event.location} required disabled={isPending} />
        {state.fieldErrors?.location && (
          <p className="text-xs text-destructive">{state.fieldErrors.location[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="host">Host</Label>
        <Input id="host" name="host" defaultValue={event.host} required disabled={isPending} />
        {state.fieldErrors?.host && (
          <p className="text-xs text-destructive">{state.fieldErrors.host[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="tag">Category</Label>
        <Select name="tag" defaultValue={event.tag} disabled={isPending}>
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
          defaultValue={event.description}
          required
          disabled={isPending}
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {event.seriesId ? (
        <div className="grid gap-1.5">
          <Label>Church</Label>
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
        <div className="grid gap-1.5">
          <Label htmlFor="churchId">Church</Label>
          <Select name="churchId" defaultValue={event.churchId ?? ""} disabled={isPending}>
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
          {state.fieldErrors?.churchId && (
            <p className="text-xs text-destructive">{state.fieldErrors.churchId[0]}</p>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
