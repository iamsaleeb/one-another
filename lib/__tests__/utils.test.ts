import { cn } from "@/lib/utils";

describe("cn", () => {
  it("returns a single class name unchanged", () => {
    expect(cn("foo")).toBe("foo");
  });

  it("merges multiple class names with a space", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("omits falsy values", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
    expect(cn("foo", false, 0 as unknown as string, "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind utilities (tailwind-merge)", () => {
    // px-4 should win over px-2 when it appears last
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles arrays of class names", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles object notation from clsx", () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
  });

  it("returns empty string when given no arguments", () => {
    expect(cn()).toBe("");
  });

  it("handles mixed arguments", () => {
    expect(cn("base", { active: true, disabled: false }, "extra")).toBe(
      "base active extra"
    );
  });
});
