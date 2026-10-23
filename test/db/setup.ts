import { prisma } from "@/lib/db";
import { assertTestDb } from "./urls";

// Every db test starts from empty tables.
beforeEach(async () => {
  const [{ db }] = await prisma.$queryRaw<
    Array<{ db: string }>
  >`SELECT current_database() AS db`;
  assertTestDb(db);

  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  await prisma.$executeRawUnsafe(
    `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`
  );
});

afterAll(async () => {
  await prisma.$disconnect();
});
