jest.mock("server-only", () => ({}));
jest.mock("@/lib/db", () => {
  const { fakeTable } = jest.requireActual("@/domains/roles/testing");
  return {
    prisma: {
      church: fakeTable([
        { id: "c1", name: "Alpha" },
        { id: "c2", name: "Beta" },
        { id: "c3", name: "Empty church" },
      ]),
    },
  };
});
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { buildAbility } from "../ability";
import { getChurchTargets } from "../scopes";
import { grants, platformAdmin, signInAs } from "@/domains/roles/testing";

const ids = (rows: Array<{ id: string }>) => rows.map((r) => r.id).sort();

describe("getChurchTargets", () => {
  it("platform admin sees every Church, including ones with no Events", async () => {
    signInAs("u1", platformAdmin());
    expect(ids(await getChurchTargets("create_event"))).toEqual([
      "c1",
      "c2",
      "c3",
    ]);
  });

  it("Church EVENT_CREATOR may place Events but not Series", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
    );
    expect(ids(await getChurchTargets("create_event"))).toEqual(["c1"]);
    expect(await getChurchTargets("create_series")).toEqual([]);
  });

  it("Church EVENT_MANAGER may place Events and Series", async () => {
    signInAs(
      "u1",
      grants({ church: [{ churchId: "c2", role: "EVENT_MANAGER" }] })
    );
    expect(ids(await getChurchTargets("create_event"))).toEqual(["c2"]);
    expect(ids(await getChurchTargets("create_series"))).toEqual(["c2"]);
  });

  it("Series-only staff has no standalone Church target", async () => {
    signInAs(
      "u1",
      grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
    );
    expect(await getChurchTargets("create_event")).toEqual([]);
  });

  it("guest gets nothing (empty CASL condition)", async () => {
    signInAs(null);
    expect(await getChurchTargets("create_event")).toEqual([]);
  });

  it("uses a passed Ability without touching the session", async () => {
    const ability = buildAbility(
      grants({ church: [{ churchId: "c3", role: "CHURCH_ADMIN" }] })
    );
    expect(ids(await getChurchTargets("create_series", ability))).toEqual([
      "c3",
    ]);
  });
});
