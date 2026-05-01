import { renderHook, act, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { useEventAutoSave } from "../use-event-auto-save";

jest.mock("@/lib/actions/events-crud", () => ({
  saveDraftAction: jest.fn(),
}));

const { saveDraftAction } = require("@/lib/actions/events-crud") as {
  saveDraftAction: jest.Mock;
};

// Renders both the form and the hook together — mirrors real usage.
// debounceMs defaults to 0 so tests don't need fake timers.
function renderWithForm(opts: {
  initialDraftId?: string;
  isBusy?: boolean;
  formDefaults?: Record<string, unknown>;
  debounceMs?: number;
} = {}) {
  return renderHook(() => {
    const form = useForm({
      defaultValues: { title: "", description: "", tag: "", isDraft: false, ...opts.formDefaults },
    });
    const autoSave = useEventAutoSave({
      form: form as unknown as Parameters<typeof useEventAutoSave>[0]["form"],
      initialDraftId: opts.initialDraftId,
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
    // Advance event loop without dirtying the form
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
    // mark dirty but leave title/description/tag empty
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
    saveDraftAction.mockReturnValue(new Promise((r) => { resolveAction = r; }));

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
    saveDraftAction.mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }));
    saveDraftAction.mockResolvedValue({ eventId: "draft-1" });

    const { result } = renderWithForm({ initialDraftId: "draft-1", formDefaults: { isDraft: true } });
    await act(async () => {
      result.current.form.setValue("title", "First", { shouldDirty: true });
    });
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saving"));

    // Fire a second change while first is still in flight — should NOT trigger a second call
    await act(async () => {
      result.current.form.setValue("title", "Second", { shouldDirty: true });
    });
    await new Promise((r) => setTimeout(r, 10));
    expect(saveDraftAction).toHaveBeenCalledTimes(1);

    await act(async () => resolveFirst({ eventId: "draft-1" }));
    await waitFor(() => expect(result.current.autoSaveStatus).toBe("saved"));
  });

  it("resets status to idle when saveDraftAction returns an error", async () => {
    saveDraftAction.mockResolvedValue({ error: "Unauthorized." });

    const { result } = renderWithForm();
    await act(async () => {
      result.current.form.setValue("title", "Test", { shouldDirty: true });
    });

    await waitFor(() => expect(result.current.autoSaveStatus).toBe("idle"));
    expect(saveDraftAction).toHaveBeenCalled();
  });
});
