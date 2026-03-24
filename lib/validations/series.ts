import { z } from "zod";

export const createSeriesSchema = z.object({
  name:        z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  cadence:     z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY", "CUSTOM"]),
  location:    z.string().min(1, "Location is required"),
  host:        z.string().min(1, "Host is required"),
  tag:         z.string().min(1, "Category is required"),
  churchId:    z.string().min(1, "Church is required"),
});

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
