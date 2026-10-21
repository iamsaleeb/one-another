// Test-only helpers for running the real permission rules in unit tests.
// Not exported from the domain barrel; import from "@/domains/roles/testing".
import { prismaQuery } from "@casl/prisma";
import { buildAbility } from "./lib/ability";
import type { Grants } from "./lib/grants";

export function grants(partial: Partial<Grants> = {}): Grants {
  return {
    isPlatformAdmin: false,
    church: [],
    series: [],
    event: [],
    ...partial,
  };
}

export const platformAdmin = (): Grants => grants({ isPlatformAdmin: true });

// Signs in as `userId` with real Grants (null = guest). The test file must
// mock "@/domains/roles/lib/get-ability" with jest.fn() getAbility and
// getSessionUserId.
export function signInAs(userId: string | null, userGrants: Grants = grants()) {
  const m = jest.requireMock("@/domains/roles/lib/get-ability") as {
    getAbility: jest.Mock;
    getSessionUserId: jest.Mock;
  };
  m.getSessionUserId.mockResolvedValue(userId);
  m.getAbility.mockResolvedValue(buildAbility(userId ? userGrants : null));
}

// Evaluates a Prisma `where` (including CASL accessibleBy output) in JS.
export function matchesWhere(where: object | undefined, row: object): boolean {
  if (!where) return true;
  return Boolean(prismaQuery(where as Record<string, unknown>)(row));
}

function notFound(): Error {
  return Object.assign(new Error("No record was found"), { code: "P2025" });
}

// An in-memory Prisma model delegate whose reads and writes honour `where`,
// so permission-scoped queries filter rows exactly as the database would.
export function fakeTable<Row extends { id: string }>(initial: Row[]) {
  const rows = initial.map((r) => ({ ...r }));
  const find = (where?: object) => rows.find((r) => matchesWhere(where, r));
  // Reads return copies, as Prisma does, so later writes don't mutate them.
  const copy = (row: Row | undefined) => (row ? { ...row } : null);
  return {
    rows,
    findFirst: jest.fn(async ({ where }: { where?: object } = {}) => {
      return copy(find(where));
    }),
    findUnique: jest.fn(async ({ where }: { where: object }) => {
      return copy(find(where));
    }),
    findMany: jest.fn(async ({ where }: { where?: object } = {}) => {
      return rows.filter((r) => matchesWhere(where, r)).map((r) => ({ ...r }));
    }),
    count: jest.fn(async ({ where }: { where?: object } = {}) => {
      return rows.filter((r) => matchesWhere(where, r)).length;
    }),
    update: jest.fn(
      async ({ where, data }: { where: object; data: Partial<Row> }) => {
        const row = find(where);
        if (!row) throw notFound();
        Object.assign(row, data);
        return row;
      }
    ),
    delete: jest.fn(async ({ where }: { where: object }) => {
      const row = find(where);
      if (!row) throw notFound();
      rows.splice(rows.indexOf(row), 1);
      return row;
    }),
  };
}
