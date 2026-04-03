import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  datetimeISO: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  host: z.string().min(1, "Host is required"),
  tag: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  churchId: z.string().optional(),
  seriesId: z.string().optional(),
  requiresRegistration: z.boolean().optional(),
  capacity: z.number().int().positive().optional(),
  collectPhone: z.boolean().optional(),
  collectNotes: z.boolean().optional(),
  price: z.string().optional(),
  isDraft: z.boolean().optional(),
  photoUrl: z.string().url().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const registerEventSchema = z.object({
  phone: z.string().optional(),
  notes: z.string().optional(),
});

export type RegisterEventInput = z.infer<typeof registerEventSchema>;
