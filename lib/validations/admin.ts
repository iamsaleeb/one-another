import { z } from "zod";

export const addOrganiserSchema = z.object({
  churchId: z.string({ error: "Church is required" }).min(1, "Church is required"),
  email: z.string({ error: "Email is required" }).min(1, "Email is required").email("Invalid email address"),
});

export const removeOrganiserSchema = z.object({
  churchId: z.string({ error: "Church is required" }).min(1),
  targetUserId: z.string({ error: "User is required" }).min(1),
});

export type AddOrganiserInput = z.infer<typeof addOrganiserSchema>;
export type RemoveOrganiserInput = z.infer<typeof removeOrganiserSchema>;
