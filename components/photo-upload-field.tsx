"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UploadDropzone } from "@/lib/uploadthing";
import { deleteUploadedFileAction } from "@/lib/actions/upload";

interface PhotoUploadFieldProps {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}

export function PhotoUploadField({ value, onChange }: PhotoUploadFieldProps) {
  const [localUrl, setLocalUrl] = useState(value);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemove = async () => {
    if (!localUrl) return;
    const urlToDelete = localUrl;
    setLocalUrl(undefined);
    onChange(undefined);
    setIsDeleting(true);
    await deleteUploadedFileAction(urlToDelete);
    setIsDeleting(false);
  };

  if (localUrl) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-muted">
        <Image
          src={localUrl}
          alt="Cover photo"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="absolute top-2 right-2 size-8 bg-white/90 hover:bg-white"
          onClick={handleRemove}
          disabled={isDeleting}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <UploadDropzone
        endpoint="coverPhoto"
        onClientUploadComplete={(res) => {
          setUploadError(null);
          setLocalUrl(res[0].ufsUrl);
          onChange(res[0].ufsUrl);
        }}
        onUploadError={(error) => {
          setUploadError(error.message);
        }}
        appearance={{
          container:
            "border-2 border-dashed border-input rounded-xl bg-background ut-uploading:border-primary",
          uploadIcon: "text-muted-foreground",
          label: "text-sm font-medium text-foreground ut-ready:text-foreground",
          allowedContent: "text-xs text-muted-foreground ut-uploading:text-primary",
          button:
            "bg-primary text-primary-foreground text-sm rounded-lg px-4 py-2 ut-ready:bg-primary ut-uploading:cursor-not-allowed",
        }}
        content={{
          label: "Add Cover Photo",
          allowedContent: "Images up to 4MB",
        }}
      />
      {uploadError && (
        <p className="text-sm text-destructive">{uploadError}</p>
      )}
    </div>
  );
}
