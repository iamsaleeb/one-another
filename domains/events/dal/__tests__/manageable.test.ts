jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => {
  const { fakeTable } = jest.requireActual("@/domains/roles/testing");
  return {
    prisma: {
      event: fakeTable([
        { id: "e1", churchId: "c1", seriesId: null },
        { id: "e2", churchId: "c1", seriesId: "s1" },
        { id: "e3", churchId: "c2", seriesId: "s3" },
      ]),
      series: fakeTable([
        { id: "s1", churchId: "c1" },
        { id: "s2", churchId: "c1" },
        { id: "s3", churchId: "c2" },
      ]),
    },
  };
});
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { getManageableEventsPaged } from "../manageable";
import { getManageableSeries } from "@/domains/series/dal/manageable";
import { grants, platformAdmin, signInAs } from "@/domains/roles/testing";

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id).sort();

describe("Organiser 'Manage' lists", () => {
  it("Church manager manages every Event and Series in their Church", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
    );
    expect(ids((await getManageableEventsPaged(null)).items)).toEqual([
      "e1",
      "e2",
    ]);
    expect(ids(await getManageableSeries())).toEqual(["s1", "s2"]);
  });

  it("Series manager sees their Series and its sessions only", async () => {
    signInAs(
      "u1",
      grants({ series: [{ seriesId: "s3", role: "SERIES_MANAGER" }] })
    );
    expect(ids((await getManageableEventsPaged(null)).items)).toEqual(["e3"]);
    expect(ids(await getManageableSeries())).toEqual(["s3"]);
  });

  it("Event editor sees just that Event", async () => {
    signInAs(
      "u1",
      grants({ event: [{ eventId: "e2", role: "EVENT_EDITOR" }] })
    );
    expect(ids((await getManageableEventsPaged(null)).items)).toEqual(["e2"]);
    expect(await getManageableSeries()).toEqual([]);
  });

  it("Church EVENT_CREATOR manages nothing they have no Creator Grant on", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
    );
    expect((await getManageableEventsPaged(null)).items).toEqual([]);
  });

  it("platform admin manages everything", async () => {
    signInAs("u1", platformAdmin());
    expect(ids((await getManageableEventsPaged(null)).items)).toEqual([
      "e1",
      "e2",
      "e3",
    ]);
    expect(ids(await getManageableSeries())).toEqual(["s1", "s2", "s3"]);
  });
});
