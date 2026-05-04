"use client";

import { useEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { saveDraftAction } from "@/lib/actions/events-crud";
import { localInputsToUtcDate } from "@/lib/datetime";
import type { CreateEventInput } from "@/lib/validations/event";

export type AutoSaveStatus = "idle" | "saving" | "saved";

interface UseEventAutoSaveOptions {
  form: UseFormReturn<CreateEventInput>;
  initialDraftId: string | undefined;
  isBusy: boolean;
  debounceMs?: number;
}

export interface UseEventAutoSaveResult {
  draftId: string | undefined;
  setDraftId: (id: string) => void;
  autoSaveStatus: AutoSaveStatus;
  markPublished: () => void;
}

export function useEventAutoSave({
  form,
  initialDraftId,
  isBusy,
  debounceMs = 1500,
}: UseEventAutoSaveOptions): UseEventAutoSaveResult {
  const [draftId, setDraftIdState] = useState<string | undefined>(initialDraftId);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");

  // Refs so the async timeout closure always reads latest values
  const draftIdRef = useRef(initialDraftId);
  const isBusyRef = useRef(isBusy);
  const isDirtyRef = useRef(false);
  const autoSaveInFlightRef = useRef(false);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Only true after this session writes a draft — not inherited from initialDraftId.
  // This prevents the unmount toast from firing on StrictMode's intentional remount.
  const hasSavedRef = useRef(false);
  const publishedRef = useRef(false);

  // Sync refs inline — simpler than separate useEffects.
  // isDirty must be read here (render phase) so RHF's proxy subscribes to it.
  draftIdRef.current = draftId;
  isBusyRef.current = isBusy;
  isDirtyRef.current = form.formState.isDirty;

  const setDraftId = (id: string) => {
    draftIdRef.current = id;
    hasSavedRef.current = true;
    setDraftIdState(id);
  };

  const markPublished = () => {
    publishedRef.current = true;
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    // form.watch(callback) fires on any field change without causing re-renders
    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (isBusyRef.current || autoSaveInFlightRef.current) return;
        if (!isDirtyRef.current) return;

        // Read latest values at debounce-fire time, not at watch-fire time
        const data = form.getValues();

        // Don't create a new draft until user enters something meaningful
        if (!draftIdRef.current && !data.title && !data.description && !data.tag) return;

        const payload =
          data.date && data.time
            ? { ...data, datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString() }
            : data;

        autoSaveInFlightRef.current = true;
        setAutoSaveStatus("saving");
        clearTimeout(savedResetTimerRef.current);
        try {
          const result = await saveDraftAction(draftIdRef.current, payload);
          if ("eventId" in result) {
            if (!draftIdRef.current) {
              setDraftId(result.eventId);
              form.setValue("isDraft", true, { shouldDirty: false });
            }
            hasSavedRef.current = true;
            setAutoSaveStatus("saved");
            savedResetTimerRef.current = setTimeout(() => setAutoSaveStatus("idle"), 3000);
          } else {
            setAutoSaveStatus("idle");
          }
        } catch {
          setAutoSaveStatus("idle");
        } finally {
          autoSaveInFlightRef.current = false;
        }
      }, debounceMs);
    });

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [form, debounceMs]);

  // Refs are stable — no deps needed, and exhaustive-deps doesn't flag ref.current reads.
  useEffect(() => {
    return () => {
      clearTimeout(savedResetTimerRef.current);
      if (hasSavedRef.current && !publishedRef.current) {
        toast.info("Draft saved – you can continue where you left off");
      }
    };
  }, []);

  return { draftId, setDraftId, autoSaveStatus, markPublished };
}
