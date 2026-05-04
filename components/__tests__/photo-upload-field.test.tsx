jest.mock("@vercel/blob/client", () => ({
  upload: jest.fn(),
}));

jest.mock("@/lib/actions/upload", () => ({
  deleteUploadedFileAction: jest.fn().mockResolvedValue(undefined),
}));


import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoUploadField } from "@/components/photo-upload-field";
import { upload } from "@vercel/blob/client";
import { deleteUploadedFileAction } from "@/lib/actions/upload";

const mockUpload = upload as jest.Mock;
const mockDelete = deleteUploadedFileAction as jest.Mock;

const BLOB_URL = "https://abc123.public.blob.vercel-storage.com/photo.jpg";

describe("PhotoUploadField", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("idle state", () => {
    it("renders upload area for cover variant", () => {
      render(<PhotoUploadField variant="cover" value={undefined} onChange={jest.fn()} />);
      expect(screen.getByRole("button", { name: "Add cover photo" })).toBeInTheDocument();
    });

    it("renders upload area for profile variant", () => {
      render(<PhotoUploadField variant="profile" value={undefined} onChange={jest.fn()} />);
      expect(screen.getByRole("button", { name: "Add photo" })).toBeInTheDocument();
    });
  });

  describe("preview state", () => {
    it("renders cover photo preview when value provided", () => {
      render(<PhotoUploadField variant="cover" value={BLOB_URL} onChange={jest.fn()} />);
      expect(screen.getByRole("img", { name: "Cover photo" })).toBeInTheDocument();
    });

    it("renders profile photo preview when value provided", () => {
      render(<PhotoUploadField variant="profile" value={BLOB_URL} onChange={jest.fn()} />);
      expect(screen.getByRole("img", { name: "Profile photo" })).toBeInTheDocument();
    });

    it("does not render upload area when value provided", () => {
      render(<PhotoUploadField variant="cover" value={BLOB_URL} onChange={jest.fn()} />);
      expect(screen.queryByRole("button", { name: "Add cover photo" })).not.toBeInTheDocument();
    });
  });

  describe("file validation", () => {
    it("shows error for non-image file and does not upload", async () => {
      render(<PhotoUploadField variant="cover" value={undefined} onChange={jest.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["content"], "doc.pdf", { type: "application/pdf" });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      expect(await screen.findByText("Please select an image file.")).toBeInTheDocument();
      expect(mockUpload).not.toHaveBeenCalled();
    });

    it("shows error for file over 4MB and does not upload", async () => {
      render(<PhotoUploadField variant="cover" value={undefined} onChange={jest.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const largeFile = new File(
        [new ArrayBuffer(5 * 1024 * 1024)],
        "big.jpg",
        { type: "image/jpeg" }
      );
      Object.defineProperty(input, "files", { value: [largeFile], configurable: true });
      fireEvent.change(input);
      expect(await screen.findByText("Image must be 4MB or less.")).toBeInTheDocument();
      expect(mockUpload).not.toHaveBeenCalled();
    });
  });

  describe("upload", () => {
    it("calls onChange with blob URL on successful upload", async () => {
      const onChange = jest.fn();
      mockUpload.mockResolvedValue({ url: BLOB_URL });
      render(<PhotoUploadField variant="cover" value={undefined} onChange={onChange} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(BLOB_URL);
      });
    });

    it("calls upload with correct args including variant as clientPayload", async () => {
      mockUpload.mockResolvedValue({ url: BLOB_URL });
      render(<PhotoUploadField variant="cover" value={undefined} onChange={jest.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      await waitFor(() => {
        expect(mockUpload).toHaveBeenCalledWith(
          "photo.jpg",
          file,
          expect.objectContaining({
            access: "public",
            handleUploadUrl: "/api/upload",
            clientPayload: "cover",
          })
        );
      });
    });

    it("shows error on upload failure", async () => {
      mockUpload.mockRejectedValue(new Error("Network error"));
      render(<PhotoUploadField variant="cover" value={undefined} onChange={jest.fn()} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      expect(await screen.findByText("Upload failed. Please try again.")).toBeInTheDocument();
    });

    it("clears a previous error on new successful upload", async () => {
      const onChange = jest.fn();
      mockUpload
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValueOnce({ url: BLOB_URL });
      render(<PhotoUploadField variant="cover" value={undefined} onChange={onChange} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      expect(await screen.findByText("Upload failed. Please try again.")).toBeInTheDocument();
      Object.defineProperty(input, "files", { value: [file], configurable: true });
      fireEvent.change(input);
      await waitFor(() => {
        expect(screen.queryByText("Upload failed. Please try again.")).not.toBeInTheDocument();
      });
    });
  });

  describe("remove", () => {
    it("calls onChange with undefined immediately on remove click", () => {
      const onChange = jest.fn();
      render(<PhotoUploadField variant="cover" value={BLOB_URL} onChange={onChange} />);
      fireEvent.click(screen.getByRole("button", { name: /remove photo/i }));
      expect(onChange).toHaveBeenCalledWith(undefined);
    });

    it("calls deleteUploadedFileAction with the URL", async () => {
      render(<PhotoUploadField variant="cover" value={BLOB_URL} onChange={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /remove photo/i }));
      await waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith(BLOB_URL);
      });
    });

    it("switches to upload area after remove", () => {
      render(<PhotoUploadField variant="cover" value={BLOB_URL} onChange={jest.fn()} />);
      fireEvent.click(screen.getByRole("button", { name: /remove photo/i }));
      expect(screen.getByRole("button", { name: "Add cover photo" })).toBeInTheDocument();
    });
  });
});
