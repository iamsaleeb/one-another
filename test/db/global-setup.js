// Migrates the template test database once, then clones one database per Jest
// worker from it. Cloning takes milliseconds; migrating each would not.
const { execSync } = require("child_process");
const { Client } = require("pg");
const {
  adminUrl,
  assertTestDb,
  dbName,
  templateUrl,
  workerDbName,
} = require("./urls");

async function ensureDatabase(admin, name) {
  const { rowCount } = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = $1",
    [name]
  );
  if (!rowCount) await admin.query(`CREATE DATABASE "${name}"`);
}

module.exports = async function globalSetup(globalConfig) {
  const template = dbName(new URL(templateUrl()));
  assertTestDb(template);

  const admin = new Client({ connectionString: adminUrl() });
  await admin.connect();
  try {
    await ensureDatabase(admin, template);

    execSync("npx prisma migrate deploy", {
      env: { ...process.env, DATABASE_URL: templateUrl() },
      stdio: "pipe",
    });

    const workers = Math.max(1, globalConfig.maxWorkers);
    for (let id = 1; id <= workers; id++) {
      const name = workerDbName(id);
      assertTestDb(name);
      await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.query(`CREATE DATABASE "${name}" TEMPLATE "${template}"`);
    }
  } finally {
    await admin.end();
  }
};
