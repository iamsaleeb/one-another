"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { upload } from "@vercel/blob/client";
import { ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { deleteUploadedFileAction } from "@/domains/upload/actions/upload";

const MAX_SIZE_BYTES = 4 * 1024 * 1024;

interface PhotoUploadFieldProps {
  variant: "profile" | "cover";
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}

export function PhotoUploadField({
  variant,
  value,
  onChange,
}: PhotoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localUrl, setLocalUrl] = useState(value);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingFilename, setUploadingFilename] = useState<string | null>(
    null
  );
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
    setError(null);
    setIsDeleting(true);
    try {
      await deleteUploadedFileAction(localUrl);
      setLocalUrl(undefined);
      onChange(undefined);
    } catch {
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
            "bg-muted relative w-full overflow-hidden",
            isProfile
              ? "mx-auto aspect-square max-w-24 rounded-full"
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
          <X className="mr-2 size-4" />
          {isDeleting ? "Removing..." : "Remove photo"}
        </Button>
        {error && <p className="text-destructive text-sm">{error}</p>}
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
          "border-input bg-background flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors",
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
          <div className="flex w-full flex-col items-center gap-3">
            <p className="text-muted-foreground max-w-full truncate px-4 text-sm">
              {uploadingFilename}
            </p>
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-muted-foreground text-xs">{uploadProgress}%</p>
          </div>
        ) : (
          <>
            <ImageIcon className="text-muted-foreground size-8" />
            <div className="flex flex-col items-center gap-1">
              <Button
                type="button"
                size="sm"
                aria-hidden="true"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.click();
                }}
              >
                {label}
              </Button>
              <p className="text-muted-foreground text-xs">Images up to 4MB</p>
            </div>
          </>
        )}
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
