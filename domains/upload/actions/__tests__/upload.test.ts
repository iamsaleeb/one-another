jest.mock("@vercel/blob", () => ({ del: jest.fn() }));
jest.mock("@/domains/roles/lib/get-ability", () => ({
  getAbility: jest.fn(),
  getSessionUserId: jest.fn(),
}));

import { del } from "@vercel/blob";
import { deleteUploadedFileAction } from "../upload";
import { grants, signInAs } from "@/domains/roles/testing";

const mockDel = del as jest.Mock;
const HOST = "https://abc-123.public.blob.vercel-storage.com";
const OWN = `${HOST}/cover/u1/cover-AbC123.jpg`;

beforeEach(() => {
  jest.clearAllMocks();
  signInAs("u1", grants());
});

describe("deleteUploadedFileAction", () => {
  it("lets a user delete a blob they uploaded", async () => {
    await deleteUploadedFileAction(OWN);
    expect(mockDel).toHaveBeenCalledWith(OWN);
  });

  it("handles an encoded pathname", async () => {
    const url = `${HOST}/profile/u1/my%20photo.jpg`;
    await deleteUploadedFileAction(url);
    expect(mockDel).toHaveBeenCalledWith(url);
  });

  it("ignores guests", async () => {
    signInAs(null);
    await deleteUploadedFileAction(OWN);
    expect(mockDel).not.toHaveBeenCalled();
  });

  it("refuses another user's blob, whatever Grants the caller holds", async () => {
    signInAs(
      "u2",
      grants({ church: [{ churchId: "c1", role: "CHURCH_ADMIN" }] })
    );
    await deleteUploadedFileAction(OWN);
    expect(mockDel).not.toHaveBeenCalled();
  });

  it.each([
    ["an invalid URL", "not a url"],
    [
      "a non-https URL",
      "http://abc-123.public.blob.vercel-storage.com/cover/u1/x.jpg",
    ],
    ["another host", "https://evil.example.com/cover/u1/x.jpg"],
    ["a blob with no owner prefix", `${HOST}/cover.jpg`],
    ["an unknown variant", `${HOST}/other/u1/x.jpg`],
  ])("ignores %s", async (_name, url) => {
    await deleteUploadedFileAction(url);
    expect(mockDel).not.toHaveBeenCalled();
  });
});
