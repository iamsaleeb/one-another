"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { UserRole } from "@prisma/client";
import { createSeriesSchema, type CreateSeriesState } from "@/lib/validations/series";

export async function createSeriesAction(
  _prevState: CreateSeriesState,
  formData: FormData
): Promise<CreateSeriesState> {
  const session = await auth();
  const raw = {
    name:        formData.get("name"),
    description: formData.get("description"),
    cadence:     formData.get("cadence"),
    location:    formData.get("location"),
    host:        formData.get("host"),
    tag:         formData.get("tag"),
    churchId:    formData.get("churchId") ?? "",
  };

  const parsed = createSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, description, cadence, location, host, tag, churchId } = parsed.data;

  const created = await prisma.series.create({
    data: {
      name,
      description,
      cadence,
      location,
      host,
      tag,
      churchId,
      ...(session?.user?.id ? { createdById: session.user.id } : {}),
    },
  });

  redirect(`/series/${created.id}`);
}

export async function updateSeriesAction(
  id: string,
  _prevState: CreateSeriesState,
  formData: FormData
): Promise<CreateSeriesState> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");

  const raw = {
    name:        formData.get("name"),
    description: formData.get("description"),
    cadence:     formData.get("cadence"),
    location:    formData.get("location"),
    host:        formData.get("host"),
    tag:         formData.get("tag"),
    churchId:    formData.get("churchId") ?? "",
  };

  const parsed = createSeriesSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, description, cadence, location, host, tag, churchId } = parsed.data;

  await prisma.series.update({
    where: { id },
    data: {
      name,
      description,
      cadence,
      location,
      host,
      tag,
      churchId,
    },
  });

  redirect(`/series/${id}`);
}

export async function deleteSeriesAction(id: string): Promise<void> {
  const session = await auth();
  if (session?.user?.role !== UserRole.ORGANISER) redirect("/");

  await prisma.series.delete({ where: { id } });
  redirect("/organiser");
}
