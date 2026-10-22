import { subject } from "@casl/ability";
import type { Church, Event, Series } from "@prisma/client";
import { buildAbility, hasAnyGrant, type Action } from "../ability";
import type { Grants } from "../grants";

// Fixture hierarchy:
//   c1 â”€â”€ s1 â”€â”€ e2        c2 â”€â”€ s3 â”€â”€ e4
//      â”œâ”€ s2 â”€â”€ e3
//      â””â”€ e1 (no series)
const church = (id: string) => subject("Church", { id } as Church);
const series = (id: string, churchId: string) =>
  subject("Series", { id, churchId } as Series);
const event = (id: string, churchId: string, seriesId: string | null = null) =>
  subject("Event", { id, churchId, seriesId } as Event);

const C1 = church("c1");
const C2 = church("c2");
const S1 = series("s1", "c1");
const S2 = series("s2", "c1");
const S3 = series("s3", "c2");
const E1 = event("e1", "c1");
const E2 = event("e2", "c1", "s1");
const E3 = event("e3", "c1", "s2");
const E4 = event("e4", "c2", "s3");

const ALL_EVENT_ACTIONS: Action[] = [
  "create",
  "update",
  "publish",
  "delete",
  "manage_staff",
  "view_attendees",
  "scan_attendees",
];

function grants(partial: Partial<Grants>): Grants {
  return {
    isPlatformAdmin: false,
    church: [],
    series: [],
    event: [],
    ...partial,
  };
}

describe("guest", () => {
  const ability = buildAbility(null);

  it("may do nothing", () => {
    for (const action of ALL_EVENT_ACTIONS)
      expect(ability.can(action, E1)).toBe(false);
    expect(ability.can("update", C1)).toBe(false);
    expect(ability.can("create_event", "Church")).toBe(false);
    expect(hasAnyGrant(ability)).toBe(false);
  });
});

describe("member with no Grants", () => {
  const ability = buildAbility(grants({}));

  it("may do nothing", () => {
    expect(ability.can("create", E1)).toBe(false);
    expect(hasAnyGrant(ability)).toBe(false);
  });
});

describe("platform admin", () => {
  const ability = buildAbility(grants({ isPlatformAdmin: true }));

  it("may do everything everywhere", () => {
    for (const action of ALL_EVENT_ACTIONS)
      expect(ability.can(action, E4)).toBe(true);
    expect(ability.can("manage_members", C2)).toBe(true);
    expect(ability.can("delete", S3)).toBe(true);
    expect(ability.can("manage", "all")).toBe(true);
    expect(hasAnyGrant(ability)).toBe(true);
  });
});

describe("Church CHURCH_ADMIN on c1", () => {
  const ability = buildAbility(
    grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] })
  );

  it("manages the Church", () => {
    expect(ability.can("update", C1)).toBe(true);
    expect(ability.can("manage_members", C1)).toBe(true);
  });

  it("cascades to every Series and Event in the Church", () => {
    for (const action of ALL_EVENT_ACTIONS) {
      expect(ability.can(action, E1)).toBe(true);
      expect(ability.can(action, E2)).toBe(true);
      expect(ability.can(action, E3)).toBe(true);
    }
    for (const action of ["create", "update", "delete"] as Action[]) {
      expect(ability.can(action, S1)).toBe(true);
      expect(ability.can(action, S2)).toBe(true);
    }
  });

  it("has no reach into another Church", () => {
    expect(ability.can("update", C2)).toBe(false);
    expect(ability.can("manage_members", C2)).toBe(false);
    expect(ability.can("update", S3)).toBe(false);
    for (const action of ALL_EVENT_ACTIONS)
      expect(ability.can(action, E4)).toBe(false);
  });

  it("is not a platform admin", () => {
    expect(ability.can("manage", "all")).toBe(false);
  });
});

describe("Church EVENT_MANAGER on c1", () => {
  const ability = buildAbility(
    grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
  );

  it("manages every Event and Series in the Church", () => {
    for (const action of ALL_EVENT_ACTIONS) {
      expect(ability.can(action, E1)).toBe(true);
      expect(ability.can(action, E3)).toBe(true);
    }
    expect(ability.can("create", S1)).toBe(true);
    expect(ability.can("update", S2)).toBe(true);
    expect(ability.can("delete", S2)).toBe(true);
  });

  it("cannot manage the Church itself", () => {
    expect(ability.can("update", C1)).toBe(false);
    expect(ability.can("manage_members", C1)).toBe(false);
  });

  it("has no reach into another Church", () => {
    expect(ability.can("update", E4)).toBe(false);
    expect(ability.can("update", S3)).toBe(false);
  });
});

describe("Church EVENT_CREATOR on c1", () => {
  const ability = buildAbility(
    grants({ church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
  );

  it("may create Events anywhere in the Church", () => {
    expect(ability.can("create", E1)).toBe(true);
    expect(ability.can("create", E2)).toBe(true);
    expect(ability.can("create", E3)).toBe(true);
  });

  it("may not touch existing Events (Creator Grant covers their own)", () => {
    for (const action of ALL_EVENT_ACTIONS.filter((a) => a !== "create"))
      expect(ability.can(action, E1)).toBe(false);
  });

  it("may not create or edit Series", () => {
    expect(ability.can("create", S1)).toBe(false);
    expect(ability.can("update", S1)).toBe(false);
  });

  it("has no reach into another Church", () => {
    expect(ability.can("create", E4)).toBe(false);
  });
});

describe("Series SERIES_MANAGER on s1", () => {
  const ability = buildAbility(
    grants({ series: [{ seriesId: "s1", role: "SERIES_MANAGER" }] })
  );

  it("updates the Series", () => {
    expect(ability.can("update", S1)).toBe(true);
  });

  it("cannot create or delete Series", () => {
    expect(ability.can("create", S1)).toBe(false);
    expect(ability.can("delete", S1)).toBe(false);
  });

  it("cascades to Events in the Series", () => {
    for (const action of ["create", "update", "publish", "delete"] as Action[])
      expect(ability.can(action, E2)).toBe(true);
  });

  it("does not manage staff or attendees", () => {
    expect(ability.can("manage_staff", E2)).toBe(false);
    expect(ability.can("view_attendees", E2)).toBe(false);
  });

  it("has no reach outside the Series", () => {
    expect(ability.can("update", S2)).toBe(false);
    expect(ability.can("update", E1)).toBe(false);
    expect(ability.can("update", E3)).toBe(false);
    expect(ability.can("create", E1)).toBe(false);
  });
});

describe("Series SERIES_SESSION_CREATOR on s1", () => {
  const ability = buildAbility(
    grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
  );

  it("may create Events in the Series only", () => {
    expect(ability.can("create", E2)).toBe(true);
    expect(ability.can("create", E1)).toBe(false);
    expect(ability.can("create", E3)).toBe(false);
  });

  it("may not edit Events or the Series", () => {
    expect(ability.can("update", E2)).toBe(false);
    expect(ability.can("update", S1)).toBe(false);
  });

  it("counts as an organiser", () => {
    expect(hasAnyGrant(ability)).toBe(true);
  });
});

describe("Event EVENT_MANAGER on e2", () => {
  const ability = buildAbility(
    grants({ event: [{ eventId: "e2", role: "EVENT_MANAGER" }] })
  );

  it("manages that Event", () => {
    for (const action of ALL_EVENT_ACTIONS.filter((a) => a !== "create"))
      expect(ability.can(action, E2)).toBe(true);
  });

  it("cannot create Events", () => {
    expect(ability.can("create", E2)).toBe(false);
  });

  it("has no reach to other Events or the Series", () => {
    expect(ability.can("update", E1)).toBe(false);
    expect(ability.can("update", E3)).toBe(false);
    expect(ability.can("update", S1)).toBe(false);
  });
});

describe("Event EVENT_EDITOR on e2", () => {
  const ability = buildAbility(
    grants({ event: [{ eventId: "e2", role: "EVENT_EDITOR" }] })
  );

  it("edits, publishes and deletes that Event", () => {
    for (const action of ["update", "publish", "delete"] as Action[])
      expect(ability.can(action, E2)).toBe(true);
  });

  it("does not manage staff or attendees", () => {
    expect(ability.can("manage_staff", E2)).toBe(false);
    expect(ability.can("view_attendees", E2)).toBe(false);
    expect(ability.can("scan_attendees", E2)).toBe(false);
  });

  it("has no reach to other Events", () => {
    expect(ability.can("update", E1)).toBe(false);
  });
});

describe("Grants are additive", () => {
  it("combines Grants across levels", () => {
    const ability = buildAbility(
      grants({
        church: [{ churchId: "c2", role: "EVENT_CREATOR" }],
        series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }],
        event: [{ eventId: "e3", role: "EVENT_EDITOR" }],
      })
    );
    expect(ability.can("create", E4)).toBe(true);
    expect(ability.can("create", E2)).toBe(true);
    expect(ability.can("update", E3)).toBe(true);
    expect(ability.can("update", E2)).toBe(false);
    expect(ability.can("create", E1)).toBe(false);
  });

  it("a lower Grant never narrows a Church Grant", () => {
    const ability = buildAbility(
      grants({
        church: [{ churchId: "c1", role: "EVENT_MANAGER" }],
        event: [{ eventId: "e2", role: "EVENT_EDITOR" }],
      })
    );
    expect(ability.can("manage_staff", E2)).toBe(true);
  });
});

// The `create_event` picker rules must agree exactly with the Event `create`
// rules, or a picker would offer a target the write path then rejects.
describe("create_event agrees with Event create", () => {
  const churches = [{ id: "c1" }, { id: "c2" }];
  const allSeries = [
    { id: "s1", churchId: "c1" },
    { id: "s2", churchId: "c1" },
    { id: "s3", churchId: "c2" },
  ];

  const cases: Array<[string, Grants]> = [
    ["guest-like", grants({})],
    ["platform admin", grants({ isPlatformAdmin: true })],
    ...(["CHURCH_ADMIN", "EVENT_MANAGER", "EVENT_CREATOR"] as const).map(
      (role): [string, Grants] => [
        `Church ${role}`,
        grants({ church: [{ churchId: "c1", role }] }),
      ]
    ),
    ...(["SERIES_MANAGER", "SERIES_SESSION_CREATOR"] as const).map(
      (role): [string, Grants] => [
        `Series ${role}`,
        grants({ series: [{ seriesId: "s1", role }] }),
      ]
    ),
    ...(["EVENT_MANAGER", "EVENT_EDITOR"] as const).map(
      (role): [string, Grants] => [
        `Event ${role}`,
        grants({ event: [{ eventId: "e2", role }] }),
      ]
    ),
    [
      "mixed",
      grants({
        church: [{ churchId: "c2", role: "EVENT_CREATOR" }],
        series: [{ seriesId: "s2", role: "SERIES_MANAGER" }],
      }),
    ],
  ];

  it.each(cases)("%s: create_series agrees with Series create", (_name, g) => {
    const ability = buildAbility(g);
    for (const c of churches) {
      expect(ability.can("create_series", church(c.id))).toBe(
        ability.can("create", subject("Series", { churchId: c.id } as Series))
      );
    }
  });

  it.each(cases)("%s", (_name, g) => {
    const ability = buildAbility(g);
    for (const c of churches) {
      expect(ability.can("create_event", church(c.id))).toBe(
        ability.can("create", event("new", c.id, null))
      );
    }
    for (const s of allSeries) {
      expect(ability.can("create_event", series(s.id, s.churchId))).toBe(
        ability.can("create", event("new", s.churchId, s.id))
      );
    }
  });
});

// The nav layout asks "can they do X anywhere?" with subject-type checks.
describe("subject-type checks mean 'somewhere'", () => {
  it("manage_members on Church: Church admins only", () => {
    const admin = buildAbility(
      grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] })
    );
    const manager = buildAbility(
      grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
    );
    expect(admin.can("manage_members", "Church")).toBe(true);
    expect(manager.can("manage_members", "Church")).toBe(false);
  });

  it("create on Series: Church admins and Event managers, not creators", () => {
    const manager = buildAbility(
      grants({ church: [{ churchId: "c1", role: "EVENT_MANAGER" }] })
    );
    const creator = buildAbility(
      grants({ church: [{ churchId: "c1", role: "EVENT_CREATOR" }] })
    );
    const seriesStaff = buildAbility(
      grants({ series: [{ seriesId: "s1", role: "SERIES_MANAGER" }] })
    );
    expect(manager.can("create", "Series")).toBe(true);
    expect(creator.can("create", "Series")).toBe(false);
    expect(seriesStaff.can("create", "Series")).toBe(false);
  });
});
