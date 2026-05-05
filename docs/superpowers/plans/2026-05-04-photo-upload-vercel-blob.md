# Photo Upload: Replace Uploadthing with Vercel Blob

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Uploadthing with Vercel Blob direct client uploads and a native shadcn `PhotoUploadField` component.

**Architecture:** Browser requests a client token from `/api/upload` (auth + role check happens here), then uploads directly to Vercel Blob CDN, then calls `onChange` with the returned URL. Deletes go through a server action calling `del()` from `@vercel/blob`. No Uploadthing code remains.

**Tech Stack:** `@vercel/blob`, Next.js App Router route handlers, shadcn `Button` + `Progress`, React Hook Form, `next/image`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `app/api/upload/route.ts` | Create | Token generation: auth, role check, return client upload token |
| `components/photo-upload-field.tsx` | Rewrite | Unified upload UI — idle, uploading, preview, error states |
| `lib/actions/upload.ts` | Update | Swap `utapi.deleteFiles()` → `del()` from `@vercel/blob`; update domain whitelist |
| `components/__tests__/photo-upload-field.test.tsx` | Rewrite | Mock `@vercel/blob/client`; cover all states + validation |
| `app/(onboarding)/onboarding/_components/onboarding-form.tsx` | Update | Replace `Avatar` + `UploadButton` with `<PhotoUploadField variant="profile">` |
| `next.config.ts` | Update | Swap Uploadthing image domains for `*.public.blob.vercel-storage.com` |
| `.env.example` | Update | Swap `UPLOADTHING_*` vars for `BLOB_READ_WRITE_TOKEN` |
| `lib/uploadthing.ts` | Delete | No longer needed |
| `app/api/uploadthing/core.ts` | Delete | Replaced by `app/api/upload/route.ts` |
| `app/api/uploadthing/route.ts` | Delete | Replaced by `app/api/upload/route.ts` |

---

## Task 1: Install @vercel/blob and remove Uploadthing packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @vercel/blob**

```bash
npm install @vercel/blob
```

Expected: `@vercel/blob` added to `dependencies` in `package.json`.

- [ ] **Step 2: Remove Uploadthing packages**

```bash
npm uninstall @uploadthing/react uploadthing
```

Expected: `@uploadthing/react` and `uploadthing` removed from `package.json`.

- [ ] **Step 3: Verify install**

```bash
npm ls @vercel/blob
```

Expected: version printed with no `UNMET` warnings.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: replace uploadthing with @vercel/blob"
```

---

## Task 2: Create /api/upload route handler

**Files:**
- Create: `app/api/upload/route.ts`

This route handles the Vercel Blob client upload handshake. The browser sends a request here; the server validates auth and role, then returns a signed token the browser uses to upload directly to Vercel Blob CDN.

- [ ] **Step 1: Create the route handler**

Create `app/api/upload/route.ts`:

```ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const session = await auth();

        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        const variant = clientPayload as "profile" | "cover";

        if (variant === "cover") {
          if (
            session.user.role !== UserRole.ORGANISER &&
            session.user.role !== UserRole.ADMIN
          ) {
            throw new Error("Forbidden");
          }
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/avif",
          ],
          maximumSizeInBytes: 4 * 1024 * 1024,
          tokenPayload: JSON.stringify({
            userId: session.user.id,
            variant,
          }),
        };
      },
      onUploadCompleted: async () => {
        // URL is returned to the client and saved via the form's onChange
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/upload/route.ts
git commit -m "feat: add /api/upload route for Vercel Blob client tokens"
```

---

## Task 3: Update lib/actions/upload.ts

**Files:**
- Modify: `lib/actions/upload.ts`

Swap `utapi.deleteFiles()` for `del()` from `@vercel/blob`. Update the domain whitelist from Uploadthing domains to the Vercel Blob domain pattern.

- [ ] **Step 1: Rewrite the file**

Replace the entire contents of `lib/actions/upload.ts` with:

```ts
"use server";

import { del } from "@vercel/blob";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

const ALLOWED_HOST_PATTERN = /^[a-z0-9-]+\.public\.blob\.vercel-storage\.com$/;

export async function deleteUploadedFileAction(url: string): Promise<void> {
  const session = await auth();
  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }

  if (parsed.protocol !== "https:") return;
  if (!ALLOWED_HOST_PATTERN.test(parsed.hostname)) return;

  await del(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/actions/upload.ts
git commit -m "feat: update deleteUploadedFileAction to use Vercel Blob del()"
```

---

## Task 4: Write failing tests for new PhotoUploadField

**Files:**
- Modify: `components/__tests__/photo-upload-field.test.tsx`

Write the new tests BEFORE rewriting the component. They must fail at this point — that confirms the tests are actually testing the new behavior, not the old Uploadthing-based code.

- [ ] **Step 1: Replace the entire test file**

Replace `components/__tests__/photo-upload-field.test.tsx` with:

```tsx
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
      Object.defineProperty(input, "files", { value: [file] });
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
      Object.defineProperty(input, "files", { value: [largeFile] });
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
      Object.defineProperty(input, "files", { value: [file] });
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
      Object.defineProperty(input, "files", { value: [file] });
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
      Object.defineProperty(input, "files", { value: [file] });
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
      Object.defineProperty(input, "files", { value: [file] });
      fireEvent.change(input);
      expect(await screen.findByText("Upload failed. Please try again.")).toBeInTheDocument();
      Object.defineProperty(input, "files", { value: [file] });
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
```

- [ ] **Step 2: Run tests — confirm they FAIL**

```bash
npx jest components/__tests__/photo-upload-field.test.tsx --no-coverage
```

Expected: Tests fail. Likely errors about `upload` mock not being called, wrong button names, or missing `variant` prop. This is correct — the old component is still in place.

- [ ] **Step 3: Commit the failing tests**

```bash
git add components/__tests__/photo-upload-field.test.tsx
git commit -m "test: write failing tests for Vercel Blob PhotoUploadField"
```

---

## Task 5: Rewrite PhotoUploadField component

**Files:**
- Modify: `components/photo-upload-field.tsx`

Replace the entire component with a variant-aware, mobile-first implementation using shadcn primitives and `@vercel/blob/client`.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `components/photo-upload-field.tsx` with:

```tsx
"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { deleteUploadedFileAction } from "@/lib/actions/upload";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;

interface PhotoUploadFieldProps {
  variant: "profile" | "cover";
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}

export function PhotoUploadField({ variant, value, onChange }: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState(value);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isUploading = uploadProgress !== null;
  const label = variant === "profile" ? "Add photo" : "Add cover photo";

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError("Image must be 4MB or less.");
      return;
    }

    setUploadingFilename(file.name);
    setUploadProgress(0);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
        clientPayload: variant,
        onUploadProgress: ({ percentage }) => {
          setUploadProgress(percentage);
        },
      });
      setUploadProgress(null);
      setUploadingFilename(null);
      setLocalUrl(blob.url);
      onChange(blob.url);
    } catch {
      setUploadProgress(null);
      setUploadingFilename(null);
      setError("Upload failed. Please try again.");
    }
  }

  async function handleRemove() {
    if (!localUrl) return;
    const urlToDelete = localUrl;
    setLocalUrl(undefined);
    onChange(undefined);
    setIsDeleting(true);
    try {
      await deleteUploadedFileAction(urlToDelete);
    } catch {
      setLocalUrl(urlToDelete);
      onChange(urlToDelete);
      setError("Failed to remove photo. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  if (localUrl) {
    const isProfile = variant === "profile";
    return (
      <div className="flex flex-col gap-2">
        <div
          className={cn(
            "relative w-full overflow-hidden bg-muted",
            isProfile
              ? "aspect-square rounded-full max-w-24 mx-auto"
              : "aspect-video rounded-xl"
          )}
        >
          <Image
            src={localUrl}
            alt={isProfile ? "Profile photo" : "Cover photo"}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleRemove}
          disabled={isDeleting}
        >
          <X className="size-4 mr-2" />
          {isDeleting ? "Removing..." : "Remove photo"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        className={cn(
          "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input bg-background p-8 transition-colors cursor-pointer",
          isDragOver && "border-primary bg-primary/5",
          isUploading && "pointer-events-none opacity-80"
        )}
        onClick={() => !isUploading && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !isUploading) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isUploading ? (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-sm text-muted-foreground truncate max-w-full px-4">
              {uploadingFilename}
            </p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-xs text-muted-foreground">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <ImageIcon className="size-8 text-muted-foreground" />
            <div className="flex flex-col items-center gap-1">
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                {label}
              </Button>
              <p className="text-xs text-muted-foreground">Images up to 4MB</p>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Run tests — confirm they PASS**

```bash
npx jest components/__tests__/photo-upload-field.test.tsx --no-coverage
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add components/photo-upload-field.tsx
git commit -m "feat: rewrite PhotoUploadField with Vercel Blob and shadcn"
```

---

## Task 6: Update call sites — add variant prop

**Files:**
- Modify: `app/(app)/events/create/_components/steps/step-basics.tsx`
- Modify: `app/(app)/series/create/_components/create-series-form.tsx`

Both files already use `PhotoUploadField`. They need `variant="cover"` added since the prop is now required.

- [ ] **Step 1: Update step-basics.tsx**

In `app/(app)/events/create/_components/steps/step-basics.tsx`, find:

```tsx
<PhotoUploadField value={field.value} onChange={field.onChange} />
```

Replace with:

```tsx
<PhotoUploadField variant="cover" value={field.value} onChange={field.onChange} />
```

- [ ] **Step 2: Update create-series-form.tsx**

In `app/(app)/series/create/_components/create-series-form.tsx`, find:

```tsx
<PhotoUploadField value={field.value} onChange={field.onChange} />
```

Replace with:

```tsx
<PhotoUploadField variant="cover" value={field.value} onChange={field.onChange} />
```

- [ ] **Step 3: Commit**

```bash
git add "app/(app)/events/create/_components/steps/step-basics.tsx" \
        "app/(app)/series/create/_components/create-series-form.tsx"
git commit -m "feat: add variant prop to PhotoUploadField call sites"
```

---

## Task 7: Update onboarding-form.tsx

**Files:**
- Modify: `app/(onboarding)/onboarding/_components/onboarding-form.tsx`

Replace the `Avatar` + `UploadButton` combo with `PhotoUploadField variant="profile"` wired directly to the `image` form field.

- [ ] **Step 1: Add PhotoUploadField import, remove Uploadthing import**

At the top of `app/(onboarding)/onboarding/_components/onboarding-form.tsx`:

Remove this import:
```tsx
import { UploadButton } from "@/lib/uploadthing";
```

Add this import (with the other component imports):
```tsx
import { PhotoUploadField } from "@/components/photo-upload-field";
```

- [ ] **Step 2: Remove unused imports**

Remove these imports that are no longer needed:
```tsx
import { Camera } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
```

Also remove `getInitials` from the `@/lib/utils` import if it is only used by the Avatar (check the file — if `getInitials` appears only in the Avatar JSX, remove it from the import).

- [ ] **Step 3: Remove local state for upload**

Remove these two `useState` declarations:
```tsx
const [uploadError, setUploadError] = useState<string | null>(null);
const [photoUrl, setPhotoUrl] = useState<string | undefined>();
```

- [ ] **Step 4: Replace the Profile Photo card section**

Find the entire Profile Photo card block (the `<div className="rounded-2xl bg-white shadow-card p-5 flex flex-col items-center gap-4">` block and everything inside it, up to its closing `</div>`):

```tsx
{/* Profile Photo */}
<div className="rounded-2xl bg-white shadow-card p-5 flex flex-col items-center gap-4">
  <p className="text-sm font-medium self-start">Profile photo</p>
  <div className="flex flex-col items-center gap-3">
    <Avatar className="size-24 text-2xl">
      <AvatarImage src={photoUrl ?? ""} />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials(userName, userEmail)}
      </AvatarFallback>
    </Avatar>
    <UploadButton
      endpoint="profilePhoto"
      onClientUploadComplete={(res) => {
        const url = res?.[0]?.ufsUrl;
        if (!url) {
          setUploadError("Upload finished but no URL was returned. Please try again.");
          return;
        }
        setUploadError(null);
        setPhotoUrl(url);
        form.setValue("image", url);
      }}
      onUploadError={(error) => {
        setUploadError(error.message);
      }}
      appearance={{
        button:
          "bg-primary text-primary-foreground text-xs rounded-lg px-3 py-1.5 ut-ready:bg-primary ut-uploading:cursor-not-allowed ut-uploading:bg-primary/70",
        allowedContent: "hidden",
        container: "w-auto",
      }}
      content={{
        button: (
          <span className="flex items-center gap-1.5">
            <Camera className="size-3.5" />
            {photoUrl ? "Change photo" : "Add photo"}
          </span>
        ),
      }}
    />
    {uploadError && (
      <p className="text-xs text-destructive text-center">{uploadError}</p>
    )}
  </div>
</div>
```

Replace with:

```tsx
{/* Profile Photo */}
<div className="rounded-2xl bg-white shadow-card p-5 flex flex-col gap-4">
  <p className="text-sm font-medium">Profile photo</p>
  <FormField
    control={form.control}
    name="image"
    render={({ field }) => (
      <FormItem>
        <FormControl>
          <PhotoUploadField
            variant="profile"
            value={field.value}
            onChange={field.onChange}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
</div>
```

- [ ] **Step 5: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add "app/(onboarding)/onboarding/_components/onboarding-form.tsx"
git commit -m "feat: replace onboarding UploadButton with PhotoUploadField"
```

---

## Task 8: Update next.config.ts and .env.example

**Files:**
- Modify: `next.config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Update image domains in next.config.ts**

In `next.config.ts`, find the `remotePatterns` array:

```ts
remotePatterns: [
  {
    protocol: "https",
    hostname: "utfs.io",
  },
  {
    protocol: "https",
    hostname: "*.ufs.sh",
  },
],
```

Replace with:

```ts
remotePatterns: [
  {
    protocol: "https",
    hostname: "*.public.blob.vercel-storage.com",
  },
],
```

- [ ] **Step 2: Update .env.example**

In `.env.example`, find:

```
# ─────────────────────────────────────────────
# UploadThing (photo uploads)
# ─────────────────────────────────────────────
# Found at https://uploadthing.com/dashboard → your app → API Keys
UPLOADTHING_APP_ID=your-uploadthing-app-id
UPLOADTHING_TOKEN=your-uploadthing-token
```

Replace with:

```
# ─────────────────────────────────────────────
# Vercel Blob (photo uploads)
# ─────────────────────────────────────────────
# Found at Vercel Dashboard → Storage → Blob → your store → .env.local
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token_here
```

- [ ] **Step 3: Commit**

```bash
git add next.config.ts .env.example
git commit -m "chore: update image domains and env vars for Vercel Blob"
```

---

## Task 9: Delete Uploadthing files

**Files:**
- Delete: `lib/uploadthing.ts`
- Delete: `app/api/uploadthing/core.ts`
- Delete: `app/api/uploadthing/route.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm lib/uploadthing.ts \
       app/api/uploadthing/core.ts \
       app/api/uploadthing/route.ts
```

- [ ] **Step 2: Remove the uploadthing directory if empty**

```bash
rmdir app/api/uploadthing 2>/dev/null; echo "done"
```

- [ ] **Step 3: Run tests to confirm nothing broke**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: delete Uploadthing files"
```

---

## Task 10: TypeScript check and build verification

**Files:** None modified — verification only.

- [ ] **Step 1: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors. If errors appear, they will point to remaining `@uploadthing` imports — fix them before proceeding.

- [ ] **Step 2: Next.js build**

```bash
npm run build
```

Expected: Build completes with no errors. If it fails on missing `BLOB_READ_WRITE_TOKEN`, that is expected in CI without env vars set — the route handler will return errors at runtime, not at build time.

- [ ] **Step 3: Add BLOB_READ_WRITE_TOKEN to .env.local**

Get the token from Vercel Dashboard → Storage → Blob → your store → `.env.local` tab. Add to your local `.env.local`:

```
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxxxxx
```

> **Note:** If no Blob store exists yet, create one at Vercel Dashboard → Storage → Create → Blob. The store name can be anything (e.g. `one-another-uploads`). Copy the `BLOB_READ_WRITE_TOKEN` from the `.env.local` tab.

- [ ] **Step 4: Final commit**

```bash
git add -p  # review any remaining changes
git commit -m "chore: final cleanup after Vercel Blob migration"
```
