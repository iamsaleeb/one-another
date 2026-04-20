import { z } from "zod";

export const addOrganiserSchema = z.object({
  churchId: z.string().min(1, "Church is required"),
  email: z.string().email("Invalid email address"),
});

export const removeOrganiserSchema = z.object({
  churchId: z.string().min(1),
  targetUserId: z.string().min(1),
});

export type AddOrganiserInput = z.infer<typeof addOrganiserSchema>;
export type RemoveOrganiserInput = z.infer<typeof removeOrganiserSchema>;
