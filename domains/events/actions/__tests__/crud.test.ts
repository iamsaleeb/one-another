// The actions only check the session and the input's shape, then hand over to
// the Event lifecycle (tested against a real database in lifecycle.db.test.ts).
jest.mock("next/navigation", () => ({
  redirect: jest.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

jest.mock("@/domains/events/lifecycle", () => ({
  createEvent: jest.fn(),
  saveEvent: jest.fn(),
  cancelEvent: jest.fn(),
  uncancelEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));

import { redirect } from "next/navigation";
import { getSessionUserId } from "@/domains/roles/lib/get-ability";
import * as lifecycle from "@/domains/events/lifecycle";
import { saveDraftSchema } from "../../validations/event";
import {
  cancelEventAction,
  deleteEventAction,
  saveDraftAction,
  saveEventEditsAction,
  uncancelEventAction,
} from "../crud";

const mockRedirect = redirect as unknown as jest.Mock;
const mockSession = getSessionUserId as jest.Mock;
const mocked = lifecycle as jest.Mocked<typeof lifecycle>;

async function redirectedTo(run: () => Promise<unknown>) {
  await expect(run()).rejects.toThrow("NEXT_REDIRECT");
  return mockRedirect.mock.calls.at(-1)?.[0];
}

const draft = saveDraftSchema.parse({
  title: "Sunday Worship",
  churchId: "ch-1",
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSession.mockResolvedValue("user-1");
});

describe("saveDraftAction", () => {
  it("creates a new draft and returns its id", async () => {
    mocked.createEvent.mockResolvedValue({ id: "evt-1" });

    const result = await saveDraftAction(undefined, draft);

    expect(result).toEqual({ eventId: "evt-1" });
    expect(mocked.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sunday Worship", isDraft: true })
    );
  });

  it("saves an existing Event as a draft, even when asked to publish", async () => {
    mocked.saveEvent.mockResolvedValue({});

    const result = await saveDraftAction("evt-1", { ...draft, isDraft: false });

    expect(result).toEqual({ eventId: "evt-1" });
    expect(mocked.saveEvent.mock.calls[0][1].isDraft).toBe(true);
  });

  it("passes lifecycle errors through", async () => {
    mocked.saveEvent.mockResolvedValue({ fieldErrors: { title: ["x"] } });

    expect(await saveDraftAction("evt-1", draft)).toEqual({
      fieldErrors: { title: ["x"] },
    });
  });

  it("refuses a guest", async () => {
    mockSession.mockResolvedValue(null);

    expect(await saveDraftAction(undefined, draft)).toEqual({
      error: "Unauthorised.",
    });
    expect(mocked.createEvent).not.toHaveBeenCalled();
  });

  it("rejects input of the wrong shape before reaching the lifecycle", async () => {
    const result = await saveDraftAction(undefined, {
      ...draft,
      capacity: -1,
    });

    expect(result).toHaveProperty("fieldErrors.capacity");
    expect(mocked.createEvent).not.toHaveBeenCalled();
  });
});

describe("saveEventEditsAction", () => {
  it("saves with the draft state the wizard sends", async () => {
    mocked.saveEvent.mockResolvedValue({});

    const result = await saveEventEditsAction("evt-1", {
      ...draft,
      isDraft: false,
    });

    expect(result).toEqual({ success: true });
    expect(mocked.saveEvent.mock.calls[0][1].isDraft).toBe(false);
  });

  it("passes lifecycle errors through", async () => {
    mocked.saveEvent.mockResolvedValue({ error: "Unauthorised." });

    expect(await saveEventEditsAction("evt-1", draft)).toEqual({
      error: "Unauthorised.",
    });
  });

  it("refuses a guest", async () => {
    mockSession.mockResolvedValue(null);

    expect(await saveEventEditsAction("evt-1", draft)).toEqual({
      error: "Unauthorised.",
    });
  });
});

describe("cancelEventAction", () => {
  it("cancels with the trimmed reason and redirects to the Event", async () => {
    mocked.cancelEvent.mockResolvedValue({});

    expect(
      await redirectedTo(() => cancelEventAction("evt-1", { reason: " Rain " }))
    ).toBe("/events/evt-1");
    expect(mocked.cancelEvent).toHaveBeenCalledWith("evt-1", "Rain");
  });

  it("returns lifecycle errors to the dialog", async () => {
    mocked.cancelEvent.mockResolvedValue({ error: "Unauthorised." });

    expect(await cancelEventAction("evt-1", { reason: "Rain" })).toEqual({
      error: "Unauthorised.",
    });
  });

  it("needs a reason", async () => {
    const result = await cancelEventAction("evt-1", { reason: "  " });

    expect(result.fieldErrors?.reason).toBeDefined();
    expect(mocked.cancelEvent).not.toHaveBeenCalled();
  });

  it("redirects a guest home without acting", async () => {
    mockSession.mockResolvedValue(null);

    expect(
      await redirectedTo(() => cancelEventAction("evt-1", { reason: "Rain" }))
    ).toBe("/");
    expect(mocked.cancelEvent).not.toHaveBeenCalled();
  });
});

describe.each([
  [
    "uncancelEventAction",
    () => uncancelEventAction("evt-1"),
    "uncancelEvent",
    "/events/evt-1",
  ],
  [
    "deleteEventAction",
    () => deleteEventAction("evt-1"),
    "deleteEvent",
    "/organiser",
  ],
] as const)("%s", (_name, run, fn, success) => {
  it(`redirects to ${success} on success`, async () => {
    mocked[fn].mockResolvedValue({});
    expect(await redirectedTo(run)).toBe(success);
  });

  it("redirects to /organiser when refused", async () => {
    mocked[fn].mockResolvedValue({ error: "Unauthorised." });
    expect(await redirectedTo(run)).toBe("/organiser");
  });

  it("redirects a guest home without acting", async () => {
    mockSession.mockResolvedValue(null);
    expect(await redirectedTo(run)).toBe("/");
    expect(mocked[fn]).not.toHaveBeenCalled();
  });
});
