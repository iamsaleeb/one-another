import { isAppPath } from "../lib/app-path";

describe("isAppPath", () => {
  it("accepts a path inside the app", () => {
    expect(isAppPath("/events/e1/helpers/r1")).toBe(true);
  });

  it("refuses links that leave the app, and anything not a string", () => {
    for (const url of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "events/e1",
      undefined,
      42,
    ]) {
      expect(isAppPath(url)).toBe(false);
    }
  });
});
