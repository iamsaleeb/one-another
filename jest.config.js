const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

/** @type {import('jest').Config} */
const config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
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
    // Exclude barrel re-export files — no own logic, only re-exports
    "!**/index.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};

module.exports = createJestConfig(config);
