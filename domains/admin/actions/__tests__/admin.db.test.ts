jest.mock("next/cache", () => ({
  updateTag: jest.fn(),
  revalidatePath: jest.fn(),
}));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { grants, signInAs } from "@/domains/roles/testing";
import { makeChurch, makeUser } from "@/test/db/factories";
import {
  addOrganiserToChurchAction,
  removeOrganiserFromChurchAction,
} from "../admin";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.append(key, value);
  return fd;
}

const role = (userId: string) =>
  prisma.churchMembership
    .findUnique({ where: { userId_churchId: { userId, churchId: "c1" } } })
    .then((r) => r?.role ?? null);

beforeEach(async () => {
  await makeUser("admin");
  await makeUser("u1");
  await makeChurch("c1");
  await prisma.churchMembership.create({
    data: { userId: "admin", churchId: "c1", role: "CHURCH_ADMIN" },
  });
  signInAs(
    "admin",
    grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] })
  );
});

describe("addOrganiserToChurchAction", () => {
  it("makes the account with that email an organiser", async () => {
    expect(
      await addOrganiserToChurchAction(
        {},
        form({ churchId: "c1", email: " U1@test.local " })
      )
    ).toEqual({ success: "Organiser added successfully." });
    expect(await role("u1")).toBe("EVENT_MANAGER");
  });

  it("says so when they already organise it", async () => {
    expect(
      await addOrganiserToChurchAction(
        {},
        form({ churchId: "c1", email: "admin@test.local" })
      )
    ).toEqual({ success: "User is already an organiser for this church." });
    expect(await role("admin")).toBe("CHURCH_ADMIN");
  });

  it("refuses before looking the email up", async () => {
    signInAs("u1");
    expect(
      await addOrganiserToChurchAction(
        {},
        form({ churchId: "c1", email: "nobody@test.local" })
      )
    ).toEqual({ error: "Unauthorised." });
  });

  it("reports an unknown email", async () => {
    expect(
      await addOrganiserToChurchAction(
        {},
        form({ churchId: "c1", email: "nobody@test.local" })
      )
    ).toEqual({ error: "No account found with that email." });
  });
});

describe("removeOrganiserFromChurchAction", () => {
  it("removes the organiser", async () => {
    await prisma.churchMembership.create({
      data: { userId: "u1", churchId: "c1", role: "EVENT_MANAGER" },
    });

    expect(
      await removeOrganiserFromChurchAction(
        {},
        form({ churchId: "c1", targetUserId: "u1" })
      )
    ).toEqual({ success: "Organiser removed." });
    expect(await role("u1")).toBeNull();
  });

  it("refuses a guest", async () => {
    signInAs(null);
    expect(
      await removeOrganiserFromChurchAction(
        {},
        form({ churchId: "c1", targetUserId: "admin" })
      )
    ).toEqual({ error: "Unauthorised." });
  });
});
