"use client";

import { useActionState } from "react";
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
import { createSeriesAction } from "@/lib/actions/series";
import type { CreateSeriesState } from "@/lib/validations/series";

const CATEGORIES = [
  "Worship",
  "Prayer",
  "Youth",
  "Outreach",
  "Bible Study",
  "Missions",
];

const CADENCE_OPTIONS = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
];

interface Church { id: string; name: string }

export function CreateSeriesForm({ churches }: { churches: Church[] }) {
  const [state, action, isPending] = useActionState<CreateSeriesState, FormData>(
    createSeriesAction,
    {}
  );

  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && (
        <p className="text-sm text-destructive text-center">{state.error}</p>
      )}

      <div className="grid gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required disabled={isPending} />
        {state.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} required disabled={isPending} />
        {state.fieldErrors?.description && (
          <p className="text-xs text-destructive">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="cadence">Cadence</Label>
        <Select name="cadence" disabled={isPending}>
          <SelectTrigger id="cadence">
            <SelectValue placeholder="Select cadence" />
          </SelectTrigger>
          <SelectContent>
            {CADENCE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {state.fieldErrors?.cadence && (
          <p className="text-xs text-destructive">{state.fieldErrors.cadence[0]}</p>
        )}
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
        {isPending ? "Creating..." : "Create Series"}
      </Button>
    </form>
  );
}
