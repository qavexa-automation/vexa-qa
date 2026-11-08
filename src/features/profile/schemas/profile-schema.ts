import { z } from "zod";

export const displayNameSchema = z.string().trim().min(1, "Enter the name you want to display.");
