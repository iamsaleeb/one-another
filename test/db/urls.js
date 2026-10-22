// Database URLs for the `db` Jest project. Each worker gets its own database,
// cloned from a migrated template, so test files can truncate freely.
//
// The base comes from TEST_DATABASE_URL, or DATABASE_URL with "_test" appended
// to its database name. Every name built here ends in "_test": resetDb()
// refuses to truncate anything else, which keeps the dev database safe.

function baseUrl() {
  const explicit = process.env.TEST_DATABASE_URL;
  if (explicit) return new URL(explicit);
  const dev = process.env.DATABASE_URL;
  if (!dev)
    throw new Error("Set TEST_DATABASE_URL or DATABASE_URL to run db tests");
  const url = new URL(dev);
  url.pathname = `${url.pathname}_test`;
  return url;
}

function dbName(url) {
  return decodeURIComponent(url.pathname.slice(1));
}

function withDb(url, name) {
  const next = new URL(url);
  next.pathname = `/${name}`;
  return next.toString();
}

// The migrated template every worker database is cloned from.
function templateUrl() {
  return baseUrl().toString();
}

function workerDbName(workerId) {
  return dbName(baseUrl()).replace(/_test$/, `_w${workerId}_test`);
}

function workerUrl(workerId) {
  return withDb(baseUrl(), workerDbName(workerId));
}

// The server's maintenance database, for CREATE/DROP DATABASE.
function adminUrl() {
  return withDb(baseUrl(), "postgres");
}

function assertTestDb(name) {
  if (!name.endsWith("_test"))
    throw new Error(
      `Refusing to touch database "${name}": test databases must end in "_test"`
    );
}

module.exports = {
  adminUrl,
  assertTestDb,
  dbName,
  templateUrl,
  workerDbName,
  workerUrl,
};
