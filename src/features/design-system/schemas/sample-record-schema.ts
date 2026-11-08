import { z } from "zod";

export const sampleRecordSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  code: z
    .string()
    .min(3, "Code must be at least 3 characters.")
    .regex(/^[A-Za-z0-9-]+$/, "Use letters, numbers, and hyphens only."),
  owner: z.string().min(1, "Choose an owner."),
  notes: z.string().max(280, "Keep notes under 280 characters.").optional(),
  notifications: z.boolean(),
  active: z.boolean(),
});

export type SampleRecordValues = z.infer<typeof sampleRecordSchema>;
