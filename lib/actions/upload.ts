"use server";

import { UTApi } from "uploadthing/server";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";

const utapi = new UTApi();

export async function deleteUploadedFileAction(url: string): Promise<void> {
  const session = await auth();
  if (
    session?.user?.role !== UserRole.ORGANISER &&
    session?.user?.role !== UserRole.ADMIN
  ) {
    return;
  }

  const key = url.split("/f/")[1];
  if (!key) return;

  await utapi.deleteFiles(key);
}
