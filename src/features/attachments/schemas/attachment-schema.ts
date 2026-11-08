import { z } from "zod";
import { ATTACHMENT_ENCODINGS } from "../types/attachment";

export const attachmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  storedName: z.string().min(1),
  contentType: z.string(),
  size: z.number().int().nonnegative(),
  storedSize: z.number().int().nonnegative(),
  encoding: z.enum(ATTACHMENT_ENCODINGS),
  path: z.string().min(1),
  uploadedAt: z.iso.datetime(),
});
