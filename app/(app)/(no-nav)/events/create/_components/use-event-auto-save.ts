"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { saveDraftAction } from "@/domains/events/actions/crud";
import { withInstants } from "./with-instants";
import type {
  CreateEventInput,
  SaveDraftInput,
} from "@/domains/events/validations/event";
import type { ActionResult } from "@/lib/types/action";

export type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

interface UseEventAutoSaveOptions {
  form: UseFormReturn<CreateEventInput>;
  initialDraftId: string | undefined;
  // Off for a published Event: its edits go live only through an explicit save.
  enabled?: boolean;
  isBusy: boolean;
  debounceMs?: number;
}

export interface UseEventAutoSaveResult {
  draftId: string | undefined;
  setDraftId: (id: string) => void;
  autoSaveStatus: AutoSaveStatus;
  autoSaveError: string | undefined;
  markPublished: () => void;
}

function saveErrorMessage(result: ActionResult): string {
  return (
    result.error ??
    Object.values(result.fieldErrors ?? {}).flat()[0] ??
    "Please check your entries."
  );
}

export function useEventAutoSave({
  form,
  initialDraftId,
  enabled = true,
  isBusy,
  debounceMs = 1500,
}: UseEventAutoSaveOptions): UseEventAutoSaveResult {
  const [draftId, setDraftIdState] = useState<string | undefined>(
    initialDraftId
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>("idle");
  const [autoSaveError, setAutoSaveError] = useState<string | undefined>();

  // Refs so the async closure always reads latest values
  const draftIdRef = useRef(initialDraftId);
  const isBusyRef = useRef(isBusy);
  const isDirtyRef = useRef(false);
  const autoSaveInFlightRef = useRef(false);
  // The save in flight, so leaving the page can wait for it before reporting.
  const inFlightSaveRef = useRef<Promise<void> | undefined>(undefined);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );
  // Set when a field change arrives while a save is in flight — triggers a trailing save.
  const hasPendingRef = useRef(false);
  // Only true after this session writes a draft — not inherited from initialDraftId.
  // Prevents the unmount toast from firing on StrictMode's intentional remount.
  const hasSavedRef = useRef(false);
  // Why the latest save failed; cleared by the next one that succeeds.
  const lastErrorRef = useRef<string | undefined>(undefined);
  const publishedRef = useRef(false);

  // isDirty must be read here (render phase) so RHF's proxy subscribes to it.
  const isDirty = form.formState.isDirty;

  // Sync refs after commit — refs must not be written during render.
  // Layout effect so they're current before any passive effect below runs.
  useLayoutEffect(() => {
    draftIdRef.current = draftId;
    isBusyRef.current = isBusy;
    isDirtyRef.current = isDirty;
  });

  // Holds the latest performSave so the isBusy-transition effect can call it.
  const performSaveRef = useRef<() => void>(() => {});

  // Called after a manual save succeeds, which also clears an earlier failure.
  const setDraftId = (id: string) => {
    draftIdRef.current = id;
    hasSavedRef.current = true;
    lastErrorRef.current = undefined;
    setDraftIdState(id);
    setAutoSaveError(undefined);
    setAutoSaveStatus((s) => (s === "error" ? "idle" : s));
  };

  const markPublished = () => {
    publishedRef.current = true;
  };

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function save(payload: SaveDraftInput) {
      try {
        const result = await saveDraftAction(draftIdRef.current, payload);
        if ("eventId" in result) {
          const created = !draftIdRef.current;
          // Written even after unmount, so a trailing save updates this draft
          // rather than creating another.
          draftIdRef.current = result.eventId;
          hasSavedRef.current = true;
          lastErrorRef.current = undefined;
          if (cancelled) return;
          if (created) {
            setDraftIdState(result.eventId);
            form.setValue("isDraft", true, { shouldDirty: false });
          }
          setAutoSaveError(undefined);
          setAutoSaveStatus("saved");
          savedResetTimerRef.current = setTimeout(
            () => setAutoSaveStatus("idle"),
            3000
          );
        } else {
          lastErrorRef.current = saveErrorMessage(result);
        }
      } catch {
        lastErrorRef.current = "Check your connection and try again.";
      }
      if (lastErrorRef.current && !cancelled) {
        setAutoSaveError(lastErrorRef.current);
        setAutoSaveStatus("error");
      }
    }

    function performSave() {
      timer = undefined;
      if (isBusyRef.current || autoSaveInFlightRef.current) {
        hasPendingRef.current = true;
        return;
      }
      if (!isDirtyRef.current) return;

      const data = form.getValues();
      if (!draftIdRef.current && !data.title && !data.description && !data.tag)
        return;

      hasPendingRef.current = false;
      autoSaveInFlightRef.current = true;
      if (!cancelled) {
        setAutoSaveStatus("saving");
        clearTimeout(savedResetTimerRef.current);
      }

      inFlightSaveRef.current = save(withInstants(data)).finally(() => {
        autoSaveInFlightRef.current = false;
        // Trailing save: a change arrived while we were in-flight — persist
        // it now, even if the page has since been left.
        if (hasPendingRef.current && !isBusyRef.current) performSave();
      });
    }

    performSaveRef.current = performSave;

    // form.watch(callback) fires on any field change without causing re-renders
    const { unsubscribe } = form.watch(() => {
      clearTimeout(timer);
      timer = setTimeout(performSave, debounceMs);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      // Leaving mid-debounce: save the last edits now rather than drop them.
      if (timer !== undefined) {
        clearTimeout(timer);
        performSave();
      }
    };
  }, [form, debounceMs, enabled]);

  // Flush pending changes when a manual save/publish completes (isBusy: true → false).
  // The trailing-save in performSave's finally only fires after an in-flight auto-save,
  // not after a busy period, so we need this separate trigger.
  useEffect(() => {
    if (!isBusy && hasPendingRef.current && !autoSaveInFlightRef.current) {
      performSaveRef.current();
    }
  }, [isBusy]);

  // Refs are stable — no deps needed, and exhaustive-deps doesn't flag ref.current reads.
  useEffect(() => {
    return () => {
      clearTimeout(savedResetTimerRef.current);

      // Waits out any save still in flight, so the toast tells the truth.
      const report = () => {
        if (autoSaveInFlightRef.current) {
          void inFlightSaveRef.current?.finally(report);
          return;
        }
        if (publishedRef.current) return;
        if (lastErrorRef.current) {
          toast.error(
            `Your latest changes weren't saved. ${lastErrorRef.current}`
          );
        } else if (hasSavedRef.current) {
          toast.info("Draft saved – you can continue where you left off");
        }
      };
      report();
    };
  }, []);

  return { draftId, setDraftId, autoSaveStatus, autoSaveError, markPublished };
}
