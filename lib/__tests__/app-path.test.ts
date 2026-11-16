import { isAppPath, safeRedirectPath } from "../app-path";

const OFFSITE = [
  "https://evil.example",
  "//evil.example",
  "/\\evil.example",
  "/\t/evil.example",
  "/\n/evil.example",
  "/\\/evil.example",
  "events/e1",
  "javascript:alert(1)",
  "",
  undefined,
  null,
  42,
];

describe("isAppPath", () => {
  it("accepts a path inside the app", () => {
    expect(isAppPath("/events/e1/helpers/r1")).toBe(true);
    expect(isAppPath("/churches?tab=following#top")).toBe(true);
  });

  it("refuses links that leave the app, and anything not a string", () => {
    for (const url of OFFSITE) {
      expect(isAppPath(url)).toBe(false);
    }
  });
});

describe("safeRedirectPath", () => {
  it("keeps a path inside the app", () => {
    expect(safeRedirectPath("/events/e1")).toBe("/events/e1");
  });

  it("sends anything else home", () => {
    for (const url of OFFSITE) {
      expect(safeRedirectPath(url)).toBe("/");
    }
  });
});
