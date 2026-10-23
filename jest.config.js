const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

const shared = {
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
};

// Mocked unit tests: everything except *.db.test.ts.
const unit = createJestConfig({
  ...shared,
  displayName: "unit",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testPathIgnorePatterns: [
    ...shared.testPathIgnorePatterns,
    "\\.db\\.test\\.ts$",
  ],
});

// Tests against a real Postgres: one database per worker, cloned from a
// migrated template (see test/db/). Needs a reachable server; see README.
const db = createJestConfig({
  ...shared,
  displayName: "db",
  testEnvironment: "node",
  testMatch: ["**/*.db.test.ts"],
  globalSetup: "<rootDir>/test/db/global-setup.js",
  setupFiles: ["<rootDir>/test/db/env.js"],
  setupFilesAfterEnv: ["<rootDir>/test/db/setup.ts"],
});

/** @type {() => Promise<import('jest').Config>} */
module.exports = async () => ({
  coverageProvider: "v8",
  collectCoverageFrom: [
    "components/**/*.{ts,tsx}",
    "domains/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    // Exclude generated shadcn/ui primitives — third-party, not our logic
    "!components/ui/**",
    // Exclude infrastructure / config files
    "!lib/db.ts",
    "!lib/actions/upload.ts",
    // Exclude static seed/fixture data
    "!lib/data/**",
    // Exclude Next.js App Router pages and layouts — covered by e2e tests
    "!app/**",
    "!**/*.d.ts",
    // Exclude the tests themselves (implicit with one project, not with several)
    "!**/__tests__/**",
    "!**/*.test.{ts,tsx}",
    // Exclude barrel re-export files — no own logic, only re-exports
    "!**/index.ts",
    // Exclude approval UI components — rendering-only, covered by e2e tests
    "!domains/approvals/components/**",
    // Exclude approval lib — constants, labels, tags and types only
    "!domains/approvals/lib/**",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  projects: [await unit(), await db()],
});
