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

  // Refs so the async closure always reads latest values
  const draftIdRef = useRef(initialDraftId);
  const isBusyRef = useRef(isBusy);
  const isDirtyRef = useRef(false);
  const autoSaveInFlightRef = useRef(false);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Set when a field change arrives while a save is in flight — triggers a trailing save.
  const hasPendingRef = useRef(false);
  // Only true after this session writes a draft — not inherited from initialDraftId.
  // Prevents the unmount toast from firing on StrictMode's intentional remount.
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
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function performSave() {
      if (isBusyRef.current || autoSaveInFlightRef.current) {
        hasPendingRef.current = true;
        return;
      }
      if (!isDirtyRef.current) return;

      const data = form.getValues();
      if (!draftIdRef.current && !data.title && !data.description && !data.tag) return;

      const payload =
        data.date && data.time
          ? { ...data, datetimeISO: localInputsToUtcDate(data.date, data.time).toISOString() }
          : data;

      hasPendingRef.current = false;
      autoSaveInFlightRef.current = true;
      if (!cancelled) {
        setAutoSaveStatus("saving");
        clearTimeout(savedResetTimerRef.current);
      }

      try {
        const result = await saveDraftAction(draftIdRef.current, payload);
        if (!cancelled) {
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
        }
      } catch {
        if (!cancelled) setAutoSaveStatus("idle");
      } finally {
        autoSaveInFlightRef.current = false;
        // Trailing save: a change arrived while we were in-flight — persist it now.
        if (hasPendingRef.current && !isBusyRef.current && !cancelled) {
          hasPendingRef.current = false;
          void performSave();
        }
      }
    }

    // form.watch(callback) fires on any field change without causing re-renders
    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(() => void performSave(), debounceMs);
    });

    return () => {
      cancelled = true;
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
