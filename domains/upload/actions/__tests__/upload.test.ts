jest.mock("@vercel/blob", () => ({ del: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { del } from "@vercel/blob";
import { deleteUploadedFileAction } from "../upload";
import { grants, signInAs } from "@/domains/roles/testing";

const mockDel = del as jest.Mock;
const BLOB = "https://abc-123.public.blob.vercel-storage.com/cover.jpg";

beforeEach(() => {
  jest.clearAllMocks();
  signInAs(
    "u1",
    grants({ series: [{ seriesId: "s1", role: "SERIES_SESSION_CREATOR" }] })
  );
});

describe("deleteUploadedFileAction", () => {
  it("lets any organiser (here Series-only staff) delete a blob", async () => {
    await deleteUploadedFileAction(BLOB);
    expect(mockDel).toHaveBeenCalledWith(BLOB);
  });

  it("ignores guests and members with no Grant", async () => {
    signInAs(null);
    await deleteUploadedFileAction(BLOB);
    signInAs("u2", grants());
    await deleteUploadedFileAction(BLOB);
    expect(mockDel).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid URL", "not a url"],
    ["a non-https URL", "http://abc-123.public.blob.vercel-storage.com/x.jpg"],
    ["another host", "https://evil.example.com/x.jpg"],
  ])("ignores %s", async (_name, url) => {
    await deleteUploadedFileAction(url);
    expect(mockDel).not.toHaveBeenCalled();
  });
});
