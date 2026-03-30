import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // ── Base configs ────────────────────────────────────────────────────────────
  // core-web-vitals: Next.js + React + React Hooks rules, CWV errors
  // typescript:      @typescript-eslint/recommended rules via typescript parser
  ...nextVitals,
  ...nextTs,

  // ── Best-practice overrides & additions ─────────────────────────────────────
  {
    rules: {
      // ── TypeScript ──────────────────────────────────────────────────────────

      // Enforce `import type` for type-only imports — better tree-shaking and
      // clearer intent; inline style works with verbatimModuleSyntax
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],

      // Prefer `interface` for object-type declarations — more extensible and
      // produces clearer error messages than type aliases
      "@typescript-eslint/consistent-type-definitions": ["warn", "interface"],

      // Disallow `any` — forces proper typing; warn rather than error to allow
      // gradual adoption
      "@typescript-eslint/no-explicit-any": "warn",

      // Unused vars: override the base rule with underscore-prefix opt-out so
      // intentional unused params (_prevState, _event, etc.) are allowed
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],

      // Consistent array-type syntax: prefer `string[]` over `Array<string>`
      // for simple types, but allow `Array<T>` for complex generics
      "@typescript-eslint/array-type": ["warn", { default: "array-simple" }],

      // Disallow non-null assertions (`!`) — they bypass the type checker and
      // can cause runtime crashes; use proper narrowing instead
      "@typescript-eslint/no-non-null-assertion": "error",

      // ── React ───────────────────────────────────────────────────────────────

      // Exhaustive hook dependencies — prevents stale closure bugs in
      // useEffect, useCallback, useMemo, etc. Error because missing deps are
      // real bugs, not just style issues
      "react-hooks/exhaustive-deps": "error",

      // Self-close components that have no children — cleaner JSX
      "react/self-closing-comp": ["warn", { component: true, html: false }],

      // Avoid array-index keys in lists — can cause reconciliation/state bugs
      // when items are reordered or removed
      "react/no-array-index-key": "warn",

      // ── General JavaScript best practices ───────────────────────────────────

      // Require strict equality (===) everywhere; allow `== null` shorthand for
      // null/undefined checks
      "eqeqeq": ["error", "always", { null: "ignore" }],

      // No console.log in source code — use a proper logger or remove debug
      // output before committing; .warn and .error are allowed
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // Always use const when the variable is never reassigned
      "prefer-const": "error",

      // Ban `var` — use `const` or `let` instead
      "no-var": "error",

      // Prefer template literals over string concatenation
      "prefer-template": "warn",

      // Prevent importing the same module twice in one file
      "no-duplicate-imports": "error",
    },
  },

  // ── Script overrides ────────────────────────────────────────────────────────
  // Node.js scripts (cron workers, seeder, etc.) legitimately write to stdout
  // and run outside the browser bundle, so console.log is appropriate here.
  {
    files: ["scripts/**"],
    rules: {
      "no-console": "off",
    },
  },

  // ── Ignored paths ────────────────────────────────────────────────────────────
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Jest config must use CJS require()
    "jest.config.js",
    // Generated coverage report
    "coverage/**",
    // Prisma generated client
    "node_modules/**",
    // shadcn/ui primitives — third-party generated components, not authored by us
    "components/ui/**",
    // Android/native build output
    "android/**",
  ]),
]);

export default eslintConfig;
