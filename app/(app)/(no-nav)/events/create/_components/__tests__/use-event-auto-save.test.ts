import { renderHook, act, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useEventAutoSave } from "../use-event-auto-save";
import * as eventsCrud from "@/domains/events/actions/crud";

jest.mock("@/domains/events/actions/crud", () => ({
  saveDraftAction: jest.fn(),
}));
jest.mock("sonner", () => ({ toast: { info: jest.fn(), error: jest.fn() } }));

const saveDraftAction = eventsCrud.saveDraftAction as jest.Mock;

// Renders both the form and the hook together — mirrors real usage.
// debounceMs defaults to 0 so tests don't need fake timers.
function renderWithForm(
  opts: {
    initialDraftId?: string;
    enabled?: boolean;
    isBusy?: boolean;
    formDefaults?: Record<string, unknown>;
    debounceMs?: number;
  } = {}
) {
  return renderHook(() => {
    const form = useForm({
      defaultValues: {
        title: "",
        description: "",
        tag: "",
        isDraft: false,
        ...opts.formDefaults,
      },
    });
    const autoSave = useEventAutoSave({
      form: form as unknown as Parameters<typeof useEventAutoSave>[0]["form"],
      initialDraftId: opts.initialDraftId,
      enabled: opts.enabled,
      isBusy: opts.isBusy ?? false,
      debounceMs: opts.debounceMs ?? 0,
    });
    return { form, ...autoSave };
  });
}

describe("useEventAutoSave", () => {
  beforeEach(() => jest.clearAllMocks());

  it("starts with idle status and no draftId when none provided", () => {
    const { result } = renderWithForm();
    expect(result.current.autoSaveStatus).toBe("idle");
    expect(result.current.draftId).toBeUndefined();
  });

  it("initialises draftId from initialDraftId prop", () => {
    const { result } = renderWithForm({ initialDraftId: "existing-123" });
    expect(result.current.draftId).toBe("existing-123");
  });

  it("does not auto-save when form is not dirty", async () => {
    renderWithForm();
    await act(async () => {});
    expect(saveDraftAction).not.toHaveBeenCalled();
  });

  it("does not auto-save when isBusy is true", async () => {
    const { result } = renderWithForm({ isBusy: true });
    await act(async () => {
      result.current.form.setValue("title", "test", { shouldDirty: true });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(saveDraftAction).not.toHaveBeenCalled();
  });

  it("does not create a new draft when no meaningful content entered", async () => {
    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("isDraft", true, { shouldDirty: true });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(saveDraftAction).not.toHaveBeenCalled();
  });

  it("auto-saves and captures new draftId on first save", async () => {
    saveDraftAction.mockResolvedValue({ eventId: "new-draft-123" });

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "My Event", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
    expect(saveDraftAction).toHaveBeenCalledWith(
      undefined,
      expect.objectContaining({ title: "My Event" })
    );
    expect(result.current.draftId).toBe("new-draft-123");
  });

  it("shows saving status while request is in flight", async () => {
    let resolveAction!: (v: { eventId: string }) => void;
    saveDraftAction.mockReturnValue(
      new Promise((r) => {
        resolveAction = r;
      })
    );

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "Test", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saving"));
    await act(async () => resolveAction({ eventId: "abc" }));
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
  });

  it("does not overlap concurrent auto-saves", async () => {
    let resolveFirst!: (v: { eventId: string }) => void;
    saveDraftAction.mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      })
    );
    saveDraftAction.mockResolvedValue({ eventId: "draft-1" });

    const { result } = renderWithForm({
      initialDraftId: "draft-1",
      formDefaults: { isDraft: true },
    });
    await act(async () => {
      result.current.form.setValue("title", "First", { shouldDirty: true });
    });
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saving"));

    await act(async () => {
      result.current.form.setValue("title", "Second", { shouldDirty: true });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(saveDraftAction).toHaveBeenCalledTimes(1);

    await act(async () => resolveFirst({ eventId: "draft-1" }));
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
  });

  it("performs a trailing save for changes that arrived while in-flight", async () => {
    let resolveFirst!: (v: { eventId: string }) => void;
    saveDraftAction.mockReturnValueOnce(
      new Promise((r) => {
        resolveFirst = r;
      })
    );
    saveDraftAction.mockResolvedValue({ eventId: "draft-1" });

    const { result } = renderWithForm({
      initialDraftId: "draft-1",
      formDefaults: { isDraft: true },
    });
    await act(async () => {
      result.current.form.setValue("title", "First", { shouldDirty: true });
    });
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saving"));

    // Change arrives while in-flight — should be picked up as a trailing save
    await act(async () => {
      result.current.form.setValue("title", "Second", { shouldDirty: true });
    });

    // Resolve the first save — trailing save should fire automatically
    await act(async () => resolveFirst({ eventId: "draft-1" }));
    await waitFor(() => expect(saveDraftAction).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
  });

  it("never auto-saves when disabled (a published Event)", async () => {
    const { result } = renderWithForm({
      initialDraftId: "published-1",
      enabled: false,
    });
    await act(async () => {
      result.current.form.setValue("title", "Half-typ", { shouldDirty: true });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(saveDraftAction).not.toHaveBeenCalled();
    expect(result.current.autoSaveStatus).toBe("idle");
  });

  it("shows the error when saveDraftAction returns one", async () => {
    saveDraftAction.mockResolvedValue({ error: "Unauthorised." });

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "Test", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("error"));
    expect(result.current.autoSaveError).toBe("Unauthorised.");
  });

  it("shows the first field error when saveDraftAction rejects the input", async () => {
    saveDraftAction.mockResolvedValue({
      fieldErrors: { capacity: ["Capacity must be at least 1"] },
    });

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "Test", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("error"));
    expect(result.current.autoSaveError).toBe("Capacity must be at least 1");
  });

  it("shows an error when saveDraftAction throws", async () => {
    saveDraftAction.mockRejectedValue(new Error("offline"));

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "Test", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("error"));
    expect(result.current.autoSaveError).toMatch(/connection/);
  });

  it("clears the error once a later save succeeds", async () => {
    saveDraftAction.mockResolvedValueOnce({ error: "Unauthorised." });
    saveDraftAction.mockResolvedValue({ eventId: "draft-1" });

    const { result } = renderWithForm({ initialDraftId: "draft-1" });
    await act(async () => {
      result.current.form.setValue("title", "First", { shouldDirty: true });
    });
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("error"));

    await act(async () => {
      result.current.form.setValue("title", "Second", { shouldDirty: true });
    });
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
    expect(result.current.autoSaveError).toBeUndefined();
  });

  describe("unmount toast", () => {
    it("does NOT show toast when unmounting with only initialDraftId (edit mode, no new save)", () => {
      const { unmount } = renderWithForm({ initialDraftId: "existing-123" });
      unmount();
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("does NOT show toast when unmounting with no draft at all", () => {
      const { unmount } = renderWithForm();
      unmount();
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("shows toast when unmounting after auto-save without publishing", async () => {
      saveDraftAction.mockResolvedValue({ eventId: "new-draft-123" });

      const { result, unmount } = renderWithForm();
      await act(async () => {
        result.current.form.setValue("title", "My Event", {
          shouldDirty: true,
        });
      });
      await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));

      unmount();
      expect(toast.info).toHaveBeenCalledWith(
        "Draft saved – you can continue where you left off"
      );
    });

    it("does NOT show toast when unmounting after markPublished", async () => {
      saveDraftAction.mockResolvedValue({ eventId: "new-draft-123" });

      const { result, unmount } = renderWithForm();
      await act(async () => {
        result.current.form.setValue("title", "My Event", {
          shouldDirty: true,
        });
      });
      await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));

      act(() => result.current.markPublished());
      unmount();
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("reports the failure, not success, when the latest save failed", async () => {
      saveDraftAction.mockResolvedValue({ error: "Unauthorised." });

      const { result, unmount } = renderWithForm();
      await act(async () => {
        result.current.form.setValue("title", "My Event", {
          shouldDirty: true,
        });
      });
      await waitFor(() => expect(result.current.autoSaveStatus).toBe("error"));

      unmount();
      expect(toast.info).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Unauthorised.")
      );
    });

    it("saves edits still waiting on the debounce, then reports", async () => {
      saveDraftAction.mockResolvedValue({ eventId: "draft-1" });

      const { result, unmount } = renderWithForm({
        initialDraftId: "draft-1",
        debounceMs: 60_000,
      });
      await act(async () => {
        result.current.form.setValue("title", "Last edit", {
          shouldDirty: true,
        });
      });
      expect(saveDraftAction).not.toHaveBeenCalled();

      unmount();
      expect(saveDraftAction).toHaveBeenCalledWith(
        "draft-1",
        expect.objectContaining({ title: "Last edit" })
      );
      expect(toast.info).not.toHaveBeenCalled();
      await waitFor(() =>
        expect(toast.info).toHaveBeenCalledWith(
          "Draft saved – you can continue where you left off"
        )
      );
    });

    it("says nothing when leaving a published Event", async () => {
      const { result, unmount } = renderWithForm({
        initialDraftId: "published-1",
        enabled: false,
      });
      await act(async () => {
        result.current.form.setValue("title", "Edited", { shouldDirty: true });
      });

      unmount();
      await new Promise((r) => setTimeout(r, 10));
      expect(saveDraftAction).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
    });

    it("shows toast when unmounting after manual setDraftId call", () => {
      const { result, unmount } = renderWithForm();
      act(() => result.current.setDraftId("manual-draft-456"));
      unmount();
      expect(toast.info).toHaveBeenCalledWith(
        "Draft saved – you can continue where you left off"
      );
    });
  });
});
