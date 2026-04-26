"use client";

import Image from "next/image";
import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CreateEventInput } from "@/lib/validations/event";

interface StepReviewProps {
  onPublish: () => void;
  onSaveDraft: () => void;
  isPublishing: boolean;
  isSaving: boolean;
  isDraftEvent?: boolean;
  churches: Array<{ id: string; name: string }>;
}

export function StepReview({
  onPublish,
  onSaveDraft,
  isPublishing,
  isSaving,
  isDraftEvent,
  churches,
}: StepReviewProps) {
  const { control } = useFormContext<CreateEventInput>();
  const {
    title, description, tag, date, time, location, host,
    churchId, photoUrl, price, requiresRegistration, capacity,
    collectPhone, collectNotes, campEndDate, campAllowPartialRegistration, campAgenda,
  } = useWatch({ control });

  const isCamp = tag === "Camp";
  const isDisabled = isPublishing || isSaving;

  const formatDatetime = () => {
    if (!date) return "Not set";
    if (!time) return date;
    return `${date} at ${time}`;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Event
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">{title || <span className="text-muted-foreground">No title</span>}</p>
          {description ? (
            <p className="text-sm text-muted-foreground line-clamp-3">{description}</p>
          ) : null}
          {tag ? <Badge variant="secondary" className="w-fit">{tag}</Badge> : null}
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          When &amp; Where
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm">{formatDatetime()}</p>
          <p className="text-sm text-muted-foreground">{location || "No location"}</p>
          <p className="text-sm text-muted-foreground">Host: {host || "Not set"}</p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Church &amp; Photo
        </p>
        <div className="flex items-center gap-3">
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt="Event cover"
              width={64}
              height={64}
              className="object-cover rounded-lg w-16 h-16 shrink-0"
            />
          ) : null}
          <p className="text-sm text-muted-foreground">
            {churches.find(c => c.id === churchId)?.name ?? (churchId ? "Unknown church" : "Not set")}
          </p>
        </div>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Registration
        </p>
        <div className="flex flex-col gap-1">
          <p className="text-sm">
            Price: <span className="text-muted-foreground">{price || "Free"}</span>
          </p>
          <p className="text-sm">
            Registration required:{" "}
            <span className="text-muted-foreground">{requiresRegistration ? "Yes" : "No"}</span>
          </p>
          {requiresRegistration && (
            <>
              <p className="text-sm">
                Capacity:{" "}
                <span className="text-muted-foreground">
                  {capacity ? String(capacity) : "Unlimited"}
                </span>
              </p>
              <p className="text-sm">
                Collect phone:{" "}
                <span className="text-muted-foreground">{collectPhone ? "Yes" : "No"}</span>
              </p>
              <p className="text-sm">
                Collect notes:{" "}
                <span className="text-muted-foreground">{collectNotes ? "Yes" : "No"}</span>
              </p>
            </>
          )}
        </div>
      </div>

      {isCamp && (
        <>
          <Separator />
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Camp
            </p>
            <div className="flex flex-col gap-1">
              <p className="text-sm">
                End date:{" "}
                <span className="text-muted-foreground">{campEndDate || "Not set"}</span>
              </p>
              <p className="text-sm">
                Allow partial attendance:{" "}
                <span className="text-muted-foreground">
                  {campAllowPartialRegistration ? "Yes" : "No"}
                </span>
              </p>
              <p className="text-sm">
                Agenda items:{" "}
                <span className="text-muted-foreground">{campAgenda?.length ?? 0}</span>
              </p>
            </div>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button
          type="button"
          className="w-full"
          onClick={onPublish}
          disabled={isDisabled}
        >
          {isPublishing ? "Publishing..." : "Publish Event"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onSaveDraft}
          disabled={isDisabled}
        >
          {isSaving ? "Saving..." : isDraftEvent ? "Save Draft" : "Save as Draft"}
        </Button>
      </div>
    </div>
  );
}
