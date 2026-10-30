jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { revalidatePath, updateTag } from "next/cache";
import { prisma } from "@/lib/db";
import {
  as,
  makeChurch,
  makeEvent,
  makeSeries,
  makeUser,
  pending,
} from "@/test/db/factories";
import {
  cancelAccessRequest,
  grant,
  grantCreator,
  removeGrant,
  requestAccess,
  reviewAccessRequest,
  revokeHelper,
  type AccessResource,
} from "../access";

const C1: AccessResource = { type: "CHURCH", id: "c1" };
const S1: AccessResource = { type: "SERIES", id: "s1" };
const E1: AccessResource = { type: "EVENT", id: "e1" };

const admin = () =>
  as("admin", { church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] });

const requestOf = (requesterId: string) =>
  prisma.accessRequest.findFirstOrThrow({ where: { requesterId } });

const eventRole = (userId: string, eventId = "e1") =>
  prisma.eventStaffAssignment
    .findUnique({ where: { userId_eventId: { userId, eventId } } })
    .then((r) => r?.role ?? null);

const seriesRole = (userId: string, seriesId = "s1") =>
  prisma.seriesStaffAssignment
    .findUnique({ where: { userId_seriesId: { userId, seriesId } } })
    .then((r) => r?.role ?? null);

const churchRole = (userId: string, churchId = "c1") =>
  prisma.churchMembership
    .findUnique({ where: { userId_churchId: { userId, churchId } } })
    .then((r) => r?.role ?? null);

// u1 asks for Helper access; returns the request's id.
async function pendingRequest(resource: AccessResource = E1) {
  expect(await requestAccess(resource, "I can help", as("u1"))).toEqual({});
  return (await requestOf("u1")).id;
}

// c1 ── s1 ── e2      c1 ── e1      c2
beforeEach(async () => {
  jest.clearAllMocks();
  await Promise.all(["admin", "u1", "u2"].map((id) => makeUser(id)));
  await makeChurch("c1");
  await makeChurch("c2");
  await makeSeries("s1", "c1");
  await makeEvent({ id: "e1", churchId: "c1" });
  await makeEvent({ id: "e2", churchId: "c1", seriesId: "s1" });
  await prisma.churchMembership.create({
    data: { userId: "admin", churchId: "c1", role: "CHURCH_ADMIN" },
  });
});

describe("requestAccess", () => {
  it("asks for the Helper role of the resource", async () => {
    for (const [resource, role] of [
      [E1, "EVENT_EDITOR"],
      [S1, "SERIES_SESSION_CREATOR"],
      [C1, "EVENT_CREATOR"],
    ] as const) {
      expect(await requestAccess(resource, undefined, as("u2"))).toEqual({});
      const request = await prisma.accessRequest.findFirstOrThrow({
        where: { requesterId: "u2", resourceType: resource.type },
      });
      expect(request).toMatchObject({ status: "PENDING", requestedRole: role });
    }
  });

  it("refuses a guest", async () => {
    expect(await requestAccess(E1, undefined, as(null))).toEqual({
      error: "You must be signed in.",
    });
    expect(await prisma.accessRequest.count()).toBe(0);
  });

  it("refuses a missing resource", async () => {
    expect(
      await requestAccess({ type: "EVENT", id: "nope" }, undefined, as("u1"))
    ).toEqual({ error: "Resource not found." });
  });

  it("refuses someone whose Grants already cover it, cascade included", async () => {
    const manager = as("u1", {
      church: [{ churchId: "c1", role: "EVENT_MANAGER" }],
    });
    expect(await requestAccess(E1, undefined, manager)).toEqual({
      error: "You already have access to this resource.",
    });
    expect(await requestAccess(S1, undefined, manager)).toEqual({
      error: "You already have access to this resource.",
    });
  });

  it("refuses a second pending request", async () => {
    await pendingRequest();
    expect(await requestAccess(E1, undefined, as("u1"))).toEqual({
      error: "You already have a pending request.",
    });
  });

  it("asks again on the same request after a denial", async () => {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "DENIED", admin());

    expect(await requestAccess(E1, "Please", as("u1"))).toEqual({});
    expect(await prisma.accessRequest.count()).toBe(1);
    expect(await requestOf("u1")).toMatchObject({
      id,
      status: "PENDING",
      message: "Please",
      reviewedBy: null,
    });
  });
});

describe("reviewAccessRequest", () => {
  it("approving gives the Grant and records the reviewer", async () => {
    const id = await pendingRequest();

    expect(await reviewAccessRequest(id, "APPROVED", admin())).toEqual({});

    expect(await eventRole("u1")).toBe("EVENT_EDITOR");
    expect(await requestOf("u1")).toMatchObject({
      status: "APPROVED",
      reviewedBy: "admin",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/events/e1/helpers");
    expect(updateTag).toHaveBeenCalledWith("access-requests-pending-EVENT-e1");
    expect(updateTag).toHaveBeenCalledWith(`access-request-${id}`);
  });

  it("denying gives nothing", async () => {
    const id = await pendingRequest();

    expect(await reviewAccessRequest(id, "DENIED", admin())).toEqual({});

    expect(await eventRole("u1")).toBeNull();
    expect((await requestOf("u1")).status).toBe("DENIED");
  });

  it("refuses someone who may not manage the Helpers", async () => {
    const id = await pendingRequest(C1);
    const eventManager = as("u2", {
      church: [{ churchId: "c1", role: "EVENT_MANAGER" }],
    });

    expect(await reviewAccessRequest(id, "APPROVED", eventManager)).toEqual({
      error: "Unauthorised.",
    });
    expect((await requestOf("u1")).status).toBe("PENDING");
    expect(await churchRole("u1")).toBeNull();
  });

  it("lets a Series manager review its Series' requests", async () => {
    const id = await pendingRequest(S1);
    const seriesManager = as("u2", {
      series: [{ seriesId: "s1", role: "SERIES_MANAGER" }],
    });

    expect(await reviewAccessRequest(id, "APPROVED", seriesManager)).toEqual(
      {}
    );
    expect(await seriesRole("u1")).toBe("SERIES_SESSION_CREATOR");
  });

  it("refuses the requester reviewing their own request", async () => {
    const id = await pendingRequest();
    const self = as("u1", {
      church: [{ churchId: "c1", role: "CHURCH_ADMIN" }],
    });

    expect(await reviewAccessRequest(id, "APPROVED", self)).toEqual({
      error: "Unauthorised.",
    });
  });

  it("never lowers a role the requester gained while pending", async () => {
    const id = await pendingRequest(C1);
    await grant(C1, "u1", "EVENT_MANAGER", admin());

    expect(await reviewAccessRequest(id, "APPROVED", admin())).toEqual({});

    expect(await churchRole("u1")).toBe("EVENT_MANAGER");
    expect((await requestOf("u1")).status).toBe("APPROVED");
  });

  it("gives nothing when a Grant from above already covers it", async () => {
    const id = await pendingRequest(E1);
    await grant(C1, "u1", "EVENT_MANAGER", admin());

    expect(await reviewAccessRequest(id, "APPROVED", admin())).toEqual({});

    expect(await eventRole("u1")).toBeNull();
    expect((await requestOf("u1")).status).toBe("APPROVED");
  });

  it("of two concurrent reviews, exactly one wins", async () => {
    const id = await pendingRequest();

    const results = await Promise.all([
      reviewAccessRequest(id, "APPROVED", admin()),
      reviewAccessRequest(id, "DENIED", admin()),
    ]);

    const failures = results.filter((r) => "error" in r);
    expect(failures).toHaveLength(1);
    const { status } = await requestOf("u1");
    expect(await eventRole("u1")).toBe(
      status === "APPROVED" ? "EVENT_EDITOR" : null
    );
  });

  it("refuses a request that is no longer pending", async () => {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "DENIED", admin());

    expect(await reviewAccessRequest(id, "APPROVED", admin())).toEqual({
      error: "Request is no longer pending.",
    });
    expect(await eventRole("u1")).toBeNull();
  });
});

describe("revokeHelper", () => {
  async function helper() {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "APPROVED", admin());
    return id;
  }

  it("takes back the Grant the request gave", async () => {
    const id = await helper();

    expect(await revokeHelper(id, admin())).toEqual({});

    expect(await eventRole("u1")).toBeNull();
    expect((await requestOf("u1")).status).toBe("REVOKED");
  });

  it("keeps a role the Helper was promoted to since", async () => {
    const id = await helper();
    await grant(E1, "u1", "EVENT_MANAGER", admin());

    expect(await revokeHelper(id, admin())).toEqual({});

    expect(await eventRole("u1")).toBe("EVENT_MANAGER");
    expect((await requestOf("u1")).status).toBe("REVOKED");
  });

  it("keeps a role the request did not give", async () => {
    // Given directly while the request was pending, so approving gave nothing.
    const id = await pendingRequest(C1);
    await grant(C1, "u1", "EVENT_CREATOR", admin());
    await reviewAccessRequest(id, "APPROVED", admin());
    expect((await requestOf("u1")).gaveGrant).toBe(false);

    expect(await revokeHelper(id, admin())).toEqual({});

    expect(await churchRole("u1")).toBe("EVENT_CREATOR");
    expect((await requestOf("u1")).status).toBe("REVOKED");
  });

  it("takes back the Grant again after asking anew", async () => {
    const id = await helper();
    await revokeHelper(id, admin());
    await requestAccess(E1, undefined, as("u1"));
    await reviewAccessRequest(id, "APPROVED", admin());

    expect(await revokeHelper(id, admin())).toEqual({});
    expect(await eventRole("u1")).toBeNull();
  });

  it("refuses a request that is not approved", async () => {
    const id = await pendingRequest();
    expect(await revokeHelper(id, admin())).toEqual({
      error: "Access is not currently approved.",
    });
  });

  it("refuses someone who may not manage the Helpers", async () => {
    const id = await helper();
    expect(await revokeHelper(id, as("u2"))).toEqual({
      error: "Unauthorised.",
    });
    expect(await eventRole("u1")).toBe("EVENT_EDITOR");
  });
});

describe("cancelAccessRequest", () => {
  it("lets the requester withdraw a pending request", async () => {
    const id = await pendingRequest();

    expect(await cancelAccessRequest(id, as("u1"))).toEqual({});
    expect((await requestOf("u1")).status).toBe("CANCELLED");
  });

  it("refuses anyone else", async () => {
    const id = await pendingRequest();

    expect(await cancelAccessRequest(id, admin())).toEqual({
      error: "Unauthorised.",
    });
    expect((await requestOf("u1")).status).toBe("PENDING");
  });

  it("refuses a request that is no longer pending", async () => {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "APPROVED", admin());

    expect(await cancelAccessRequest(id, as("u1"))).toEqual({
      error: "Request is not pending.",
    });
  });
});

describe("grant", () => {
  it("raises a lower role", async () => {
    await grant(C1, "u1", "EVENT_CREATOR", admin());

    expect(await grant(C1, "u1", "EVENT_MANAGER", admin())).toEqual({
      granted: true,
    });
    expect(await churchRole("u1")).toBe("EVENT_MANAGER");
    expect(updateTag).toHaveBeenCalledWith("churches");
  });

  it("never lowers a higher role", async () => {
    expect(await grant(C1, "admin", "EVENT_MANAGER", admin())).toEqual({
      granted: false,
    });
    expect(await churchRole("admin")).toBe("CHURCH_ADMIN");
  });

  it("refuses someone who may not manage the resource's Helpers", async () => {
    const eventManager = as("u2", {
      church: [{ churchId: "c1", role: "EVENT_MANAGER" }],
    });
    expect(await grant(C1, "u1", "EVENT_MANAGER", eventManager)).toEqual({
      error: "Unauthorised.",
    });
    expect(await churchRole("u1")).toBeNull();
  });

  it("refuses a role from another kind of resource", async () => {
    expect(await grant(C1, "u1", "EVENT_EDITOR", admin())).toEqual({
      error: "Invalid role.",
    });
  });
});

describe("removeGrant", () => {
  it("removes the Grant and revokes the request that gave it", async () => {
    const id = await pendingRequest(C1);
    await reviewAccessRequest(id, "APPROVED", admin());

    expect(await removeGrant(C1, "u1", admin())).toEqual({});

    expect(await churchRole("u1")).toBeNull();
    expect(await requestOf("u1")).toMatchObject({
      status: "REVOKED",
      reviewedBy: "admin",
    });
  });

  it("removes a Grant no request gave", async () => {
    await grant(C1, "u1", "EVENT_MANAGER", admin());

    expect(await removeGrant(C1, "u1", admin())).toEqual({});
    expect(await churchRole("u1")).toBeNull();
  });

  it("does not remove a Church admin", async () => {
    expect(await removeGrant(C1, "admin", admin())).toEqual({
      error: "Cannot remove a church admin.",
    });
    expect(await churchRole("admin")).toBe("CHURCH_ADMIN");
  });

  it("refuses someone who may not manage the resource's Helpers", async () => {
    await grant(C1, "u1", "EVENT_CREATOR", admin());
    expect(await removeGrant(C1, "u1", as("u2"))).toEqual({
      error: "Unauthorised.",
    });
    expect(await churchRole("u1")).toBe("EVENT_CREATOR");
  });
});

describe("grantCreator", () => {
  it("gives a Church EVENT_CREATOR the Creator Grant", async () => {
    const { ability } = as("u1", {
      church: [{ churchId: "c1", role: "EVENT_CREATOR" }],
    });
    await grantCreator(prisma, ability, "u1", "e1", "c1");
    expect(await eventRole("u1")).toBe("EVENT_EDITOR");
  });

  it("gives nothing when a Church Grant already covers every Event", async () => {
    const { ability } = as("u1", {
      church: [{ churchId: "c1", role: "EVENT_MANAGER" }],
    });
    await grantCreator(prisma, ability, "u1", "e1", "c1");
    expect(await eventRole("u1")).toBeNull();
  });
});

describe("an Access request belongs to its resource", () => {
  it("is deleted with it", async () => {
    await pendingRequest(E1);
    await prisma.event.delete({ where: { id: "e1" } });
    expect(await prisma.accessRequest.count()).toBe(0);
  });

  it("points at exactly the resource its type names", async () => {
    await expect(
      prisma.accessRequest.create({
        data: {
          requesterId: "u1",
          resourceType: "EVENT",
          seriesId: "s1",
          requestedRole: "EVENT_EDITOR",
        },
      })
    ).rejects.toThrow();
  });
});

describe("Access request notifications", () => {
  const received = () =>
    pending("ROLE_REQUEST_RECEIVED").then((rows) =>
      rows.map((n) => ({ userId: n.userId, body: n.body, data: n.data }))
    );

  beforeEach(async () => {
    await prisma.user.update({ where: { id: "u1" }, data: { name: "Ann" } });
  });

  it("tells whoever may review a request, and not the requester", async () => {
    // u2 manages e1 itself; the Church admin manages every Event in c1.
    await prisma.eventStaffAssignment.create({
      data: { userId: "u2", eventId: "e1", role: "EVENT_MANAGER" },
    });
    const id = await pendingRequest();

    expect(await received()).toEqual(
      ["admin", "u2"].map((userId) => ({
        userId,
        body: "Ann asked to help with Event e1.",
        data: { type: "access_request", url: `/events/e1/helpers/${id}` },
      }))
    );
  });

  it("does not tell Helpers who may not review", async () => {
    await prisma.eventStaffAssignment.create({
      data: { userId: "u2", eventId: "e1", role: "EVENT_EDITOR" },
    });
    await pendingRequest();

    expect((await received()).map((n) => n.userId)).toEqual(["admin"]);
  });

  it("tells platform admins only when nobody else can review", async () => {
    await prisma.platformRoleAssignment.create({
      data: { userId: "u2", role: "PLATFORM_ADMIN" },
    });
    await pendingRequest({ type: "CHURCH", id: "c2" });

    expect((await received()).map((n) => n.userId)).toEqual(["u2"]);
  });

  it("withdraws the news once the request is withdrawn", async () => {
    const id = await pendingRequest();
    await cancelAccessRequest(id, as("u1"));

    expect(await received()).toEqual([]);
  });

  it("tells the requester the decision, and reviewers stop hearing", async () => {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "APPROVED", admin());

    expect(await received()).toEqual([]);
    expect(await pending("ROLE_REQUEST_OUTCOME")).toMatchObject([
      {
        userId: "u1",
        title: "Request approved",
        body: "You can now help with Event e1.",
        data: { type: "access_request", url: "/events/e1" },
      },
    ]);
  });

  it("tells reviewers again when a declined request is asked anew", async () => {
    const id = await pendingRequest();
    await reviewAccessRequest(id, "DENIED", admin());
    expect(await pending("ROLE_REQUEST_OUTCOME")).toMatchObject([
      { userId: "u1", title: "Request declined" },
    ]);

    await requestAccess(E1, "Please", as("u1"));

    expect((await received()).map((n) => n.userId)).toEqual(["admin"]);
  });
});
