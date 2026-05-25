import { z } from "zod";

export const onboardingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .refine((val) => !isNaN(new Date(val).getTime()), "Invalid date")
    .refine(
      (val) => new Date(val) <= new Date(),
      "Date of birth cannot be in the future"
    )
    .optional(),
  image: z.string().url().optional(),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
