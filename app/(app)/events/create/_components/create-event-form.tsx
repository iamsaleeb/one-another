"use client";

import { useActionState, useState } from "react";
import { Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createEventAction, type CreateEventState } from "@/lib/actions/events";

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
  const [state, action, isPending] = useActionState<CreateEventState, FormData>(
    createEventAction,
    {}
  );
  const [requiresRegistration, setRequiresRegistration] = useState(false);
  const [collectPhone, setCollectPhone] = useState(false);
  const [collectNotes, setCollectNotes] = useState(false);

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

      <div className="grid gap-1.5">
        <Label htmlFor="price">Price (optional)</Label>
        <PriceInput name="price" disabled={isPending} />
      </div>

      {series ? (
        <div className="grid gap-1.5">
          <Label>Church</Label>
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
        <div className="grid gap-1.5">
          <Label htmlFor="churchId">Church</Label>
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
          {state.fieldErrors?.churchId && (
            <p className="text-xs text-destructive">{state.fieldErrors.churchId[0]}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
        <div>
          <p className="text-sm font-medium">Requires Registration</p>
          <p className="text-xs text-muted-foreground">Attendees must fill in a registration form</p>
        </div>
        <Switch
          checked={requiresRegistration}
          onCheckedChange={setRequiresRegistration}
          disabled={isPending}
        />
        <input type="hidden" name="requiresRegistration" value={requiresRegistration ? "true" : "false"} />
      </div>

      {requiresRegistration && (
        <div className="flex flex-col gap-3 rounded-xl border px-4 py-3">
          <p className="text-sm font-medium">Registration options</p>

          <div className="grid gap-1.5">
            <Label htmlFor="capacity">Spots available (optional)</Label>
            <Input
              id="capacity"
              name="capacity"
              type="number"
              min={1}
              placeholder="Unlimited"
              disabled={isPending}
            />
            {state.fieldErrors?.capacity && (
              <p className="text-xs text-destructive">{state.fieldErrors.capacity[0]}</p>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Ask for phone number</p>
            <Switch checked={collectPhone} onCheckedChange={setCollectPhone} disabled={isPending} />
            <input type="hidden" name="collectPhone" value={collectPhone ? "true" : "false"} />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Ask for dietary / accessibility needs</p>
            <Switch checked={collectNotes} onCheckedChange={setCollectNotes} disabled={isPending} />
            <input type="hidden" name="collectNotes" value={collectNotes ? "true" : "false"} />
          </div>
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Creating..." : series ? "Add Session" : "Create Event"}
      </Button>
    </form>
  );
}
