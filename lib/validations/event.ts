import { z } from "zod";

// --- Event form schemas ---

export const createEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.iso.date(),
  time: z.iso.time(),
  datetimeISO: z.iso.datetime().optional(),
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
  // Camp-specific fields (only used when tag === "Camp")
  campEndDate: z.iso.date().optional(),
  campAllowPartialRegistration: z.boolean().optional(),
  campAgenda: z
    .array(
      z.object({
        id: z.string(),
        date: z.iso.date(),
        time: z.string().optional(),
        title: z.string().min(1, "Agenda item title is required"),
        description: z.string().optional(),
      })
    )
    .optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const registerEventSchema = z.object({
  phone: z.string().optional(),
  notes: z.string().optional(),
  selectedDays: z.array(z.string()).optional(),
});

export type RegisterEventInput = z.infer<typeof registerEventSchema>;

// --- Event metadata types and parsing ---

export interface CampAgendaItem {
  id: string;
  date: string;
  time?: string;
  title: string;
  description?: string;
}

export interface EventMetadata {
  registration: {
    capacity: number | null;
    collectPhone: boolean;
    collectNotes: boolean;
  };
  camp?: {
    endDate: string;
    allowPartialRegistration: boolean;
    agenda: CampAgendaItem[];
  };
}

export interface EventAttendeeMetadata {
  selectedDays?: string[];
}

const registrationDefault = { capacity: null, collectPhone: false, collectNotes: false };

const eventMetadataSchema = z
  .object({
    registration: z
      .object({
        capacity: z.number().nullable().catch(null),
        collectPhone: z.boolean().catch(false),
        collectNotes: z.boolean().catch(false),
      })
      .catch(registrationDefault),
    camp: z
      .object({
        endDate: z.string(),
        allowPartialRegistration: z.boolean().default(false),
        agenda: z
          .array(
            z.object({
              id: z.string(),
              date: z.string(),
              time: z.string().optional(),
              title: z.string(),
              description: z.string().optional(),
            })
          )
          .default([]),
      })
      .optional()
      .catch(undefined),
  })
  .catch({ registration: registrationDefault });

export function parseEventMetadata(raw: unknown): EventMetadata {
  return eventMetadataSchema.parse(raw);
}

const eventAttendeeMetadataSchema = z
  .object({ selectedDays: z.array(z.string()).optional() })
  .catch({});

export function parseEventAttendeeMetadata(raw: unknown): EventAttendeeMetadata {
  return eventAttendeeMetadataSchema.parse(raw);
}
