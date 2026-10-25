// Placement against a real database: the Church dropdown on an edit page
// offers exactly the moves the save accepts.
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { canPlace, placementTargets, type Placed } from "../lib/placement";
import { as, makeChurch } from "@/test/db/factories";

const ids = (churches: Array<{ id: string }>) => churches.map((c) => c.id);

const c1 = { id: "c1", name: "Church c1" };
const event: Placed = {
  type: "Event",
  id: "e1",
  churchId: "c1",
  seriesId: null,
};
const series: Placed = { type: "Series", id: "s1", churchId: "c1" };

beforeEach(async () => {
  await Promise.all(["c1", "c2", "c3"].map((id) => makeChurch(id)));
});

describe("moving an Event", () => {
  it("is allowed where the user may create and still edit it", () => {
    const { ability } = as("u", {
      church: [{ churchId: "c2", role: "EVENT_MANAGER" }],
    });
    expect(canPlace(ability, { ...event, churchId: "c2" })).toBe(true);
  });

  // Editing it through the old Church's Grant, and only allowed to create at
  // the new one: the move would lock the user out of the Event.
  it("is refused where the user could create but not edit it", () => {
    const { ability } = as("u", {
      church: [
        { churchId: "c1", role: "EVENT_MANAGER" },
        { churchId: "c2", role: "EVENT_CREATOR" },
      ],
    });
    expect(canPlace(ability, { ...event, churchId: "c2" })).toBe(false);
  });

  it("offers its own Church plus every Church the save accepts", async () => {
    const { ability } = as("u", {
      church: [
        { churchId: "c1", role: "CHURCH_ADMIN" },
        { churchId: "c2", role: "EVENT_MANAGER" },
        { churchId: "c3", role: "EVENT_CREATOR" },
      ],
    });
    const offered = await placementTargets(ability, event, c1);

    expect(ids(offered)).toEqual(["c1", "c2"]);
    for (const { id } of offered)
      expect(canPlace(ability, { ...event, churchId: id })).toBe(true);
  });

  it("still offers its own Church when it may move nowhere", async () => {
    const { ability } = as("u", {
      event: [{ eventId: "e1", role: "EVENT_EDITOR" }],
    });
    expect(await placementTargets(ability, event, c1)).toEqual([c1]);
  });
});

describe("moving a Series", () => {
  it("is refused where the user may not create Series", () => {
    const { ability } = as("u", {
      series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
      church: [{ churchId: "c2", role: "EVENT_CREATOR" }],
    });
    expect(canPlace(ability, { ...series, churchId: "c2" })).toBe(false);
  });

  it("offers its own Church plus every Church the save accepts", async () => {
    const { ability } = as("u", {
      series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
      church: [
        { churchId: "c2", role: "CHURCH_ADMIN" },
        { churchId: "c3", role: "EVENT_CREATOR" },
      ],
    });
    const offered = await placementTargets(ability, series, c1);

    expect(ids(offered)).toEqual(["c1", "c2"]);
  });
});
