/**
 * @jest-environment node
 */

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));
jest.mock("@vercel/blob/client", () => ({
  handleUpload: jest.fn(),
}));

import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { handleUpload } from "@vercel/blob/client";
import { POST } from "../route";
import { grants, platformAdmin, signInAs } from "@/domains/roles/testing";

const mockAuth = auth as jest.Mock;
const mockHandleUpload = handleUpload as jest.Mock;

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({
    user: { id: "user-1" },
  });
  signInAs("user-1", grants());
  mockHandleUpload.mockResolvedValue({
    url: "https://example.public.blob.vercel-storage.com/img.jpg",
  });
});

describe("POST /api/upload", () => {
  describe("auth checks (via onBeforeGenerateToken)", () => {
    it("returns 401 when unauthenticated", async () => {
      mockAuth.mockResolvedValue(null);
      // handleUpload calls onBeforeGenerateToken — simulate it throwing
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken("img.jpg", "profile");
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe("Unauthorized");
    });

    it("returns 403 when a non-organiser requests a cover token", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1" },
      });
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken("cover/user-1/img.jpg", "cover");
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toBe("Forbidden");
    });

    it("allows ORGANISER to request a cover token", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-2" } });
      signInAs(
        "user-2",
        grants({ church: [{ churchId: "ch-1", role: "EVENT_MANAGER" }] })
      );
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        const opts = await onBeforeGenerateToken(
          "cover/user-2/img.jpg",
          "cover"
        );
        return { tokenPayload: opts.tokenPayload };
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(200);
    });

    it("allows ADMIN to request a cover token", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-3" } });
      signInAs("user-3", platformAdmin());
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        const opts = await onBeforeGenerateToken(
          "cover/user-3/img.jpg",
          "cover"
        );
        return { tokenPayload: opts.tokenPayload };
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(200);
    });

    it("allows Series-only staff (no Church Grant) to request a cover token", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-4" } });
      signInAs(
        "user-4",
        grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
      );
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        const opts = await onBeforeGenerateToken(
          "cover/user-4/img.jpg",
          "cover"
        );
        return { tokenPayload: opts.tokenPayload };
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(200);
    });

    it("allows any authenticated user to request a profile token", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1" },
      });
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        const opts = await onBeforeGenerateToken(
          "profile/user-1/avatar.jpg",
          "profile"
        );
        return { tokenPayload: opts.tokenPayload };
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(200);
    });

    it.each([
      ["no owner prefix", "avatar.jpg", "profile"],
      ["another user's prefix", "profile/user-2/avatar.jpg", "profile"],
      ["a prefix for another variant", "cover/user-1/avatar.jpg", "profile"],
    ])("returns 403 for a pathname with %s", async (_name, path, variant) => {
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken(path, variant);
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(403);
    });
  });

  describe("token options (via onBeforeGenerateToken)", () => {
    it("returns allowedContentTypes covering common image formats", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1" },
      });
      let capturedOpts:
        | Awaited<
            ReturnType<
              Parameters<typeof handleUpload>[0]["onBeforeGenerateToken"]
            >
          >
        | undefined;

      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        capturedOpts = await onBeforeGenerateToken(
          "profile/user-1/img.png",
          "profile"
        );
        return {};
      });

      await POST(makeRequest({ type: "blob.generate-client-token" }));

      expect(capturedOpts?.allowedContentTypes).toEqual(
        expect.arrayContaining([
          "image/jpeg",
          "image/png",
          "image/webp",
          "image/gif",
          "image/avif",
        ])
      );
    });

    it("caps upload size at 4MB", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1" },
      });
      let capturedOpts:
        | Awaited<
            ReturnType<
              Parameters<typeof handleUpload>[0]["onBeforeGenerateToken"]
            >
          >
        | undefined;

      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        capturedOpts = await onBeforeGenerateToken(
          "profile/user-1/img.png",
          "profile"
        );
        return {};
      });

      await POST(makeRequest({ type: "blob.generate-client-token" }));

      expect(capturedOpts?.maximumSizeInBytes).toBe(4 * 1024 * 1024);
    });

    it("includes userId and variant in tokenPayload", async () => {
      mockAuth.mockResolvedValue({ user: { id: "user-42" } });
      signInAs(
        "user-42",
        grants({ church: [{ churchId: "ch-1", role: "EVENT_MANAGER" }] })
      );
      let capturedOpts:
        | Awaited<
            ReturnType<
              Parameters<typeof handleUpload>[0]["onBeforeGenerateToken"]
            >
          >
        | undefined;

      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        capturedOpts = await onBeforeGenerateToken(
          "cover/user-42/img.png",
          "cover"
        );
        return {};
      });

      await POST(makeRequest({ type: "blob.generate-client-token" }));

      const payload = JSON.parse(capturedOpts?.tokenPayload as string);
      expect(payload).toEqual({ userId: "user-42", variant: "cover" });
    });
  });

  describe("error handling", () => {
    it("returns 400 for malformed JSON", async () => {
      const req = new NextRequest("http://localhost/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not valid json",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when handleUpload throws an unrecognised error", async () => {
      mockHandleUpload.mockRejectedValue(new Error("Something unexpected"));
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Something unexpected");
    });

    it("returns json with error field for all failures", async () => {
      mockAuth.mockResolvedValue(null); // unauthenticated
      mockHandleUpload.mockImplementation(async ({ onBeforeGenerateToken }) => {
        await onBeforeGenerateToken("img.jpg", "profile");
      });
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      const json = await res.json();
      expect(typeof json.error).toBe("string");
    });
  });

  describe("success path", () => {
    it("returns 200 with handleUpload response", async () => {
      const mockResponse = {
        url: "https://test.public.blob.vercel-storage.com/img.jpg",
        token: "tok",
      };
      mockHandleUpload.mockResolvedValue(mockResponse);
      const res = await POST(
        makeRequest({ type: "blob.generate-client-token" })
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual(mockResponse);
    });
  });
});
