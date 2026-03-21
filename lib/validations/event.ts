import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  location: z.string().min(1, "Location is required"),
  host: z.string().min(1, "Host is required"),
  tag: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  churchId: z.string().optional(),
  seriesId: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
