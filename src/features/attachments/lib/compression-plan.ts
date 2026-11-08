import type { AttachmentEncoding } from "../types/attachment";
import { MAX_ATTACHMENTS_PER_RECORD, MAX_ATTACHMENT_BYTES } from "../types/attachment";

/** Raster images worth re-encoding to WebP. GIF is excluded so animation is never flattened. */
const RE_ENCODABLE_IMAGES = ["image/png", "image/jpeg", "image/jpg", "image/bmp", "image/webp"];

/** Longest edge kept when re-encoding an image, which bounds a screenshot's stored size. */
export const MAX_IMAGE_EDGE = 2000;
export const WEBP_QUALITY = 0.82;

/**
 * Compressing an already-compressed file (PDF, zip, docx, PNG) usually costs more than it saves,
 * so the result is only kept when it is at least this much smaller.
 */
const WORTHWHILE_RATIO = 0.95;

/**
 * The encoding to attempt for a file. Images re-encode to WebP, which is lossy but by far the
 * largest saving for the screenshots a QA record collects; everything else gzips losslessly.
 */
export function plannedEncoding(contentType: string): Exclude<AttachmentEncoding, "none"> {
  return RE_ENCODABLE_IMAGES.includes(contentType.toLowerCase().split(";")[0].trim())
    ? "webp"
    : "gzip";
}

/** Compression is only kept when it actually paid off; otherwise the original is stored as-is. */
export function worthCompressing(originalBytes: number, compressedBytes: number): boolean {
  if (originalBytes <= 0) return false;
  return compressedBytes > 0 && compressedBytes <= originalBytes * WORTHWHILE_RATIO;
}

/** The stored object's name. Only a re-encoded image changes extension; gzip is transparent. */
export function storedFileName(name: string, encoding: AttachmentEncoding): string {
  if (encoding !== "webp") return name;
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base || name}.webp`;
}

/** Scales an image down so its longest edge fits `MAX_IMAGE_EDGE`, preserving aspect ratio. */
export function scaledSize(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_EDGE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width, height };
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type RejectionReason = "too-many" | "too-large" | "empty";

/**
 * Why a file cannot be attached, or null when it can. Checked before any upload so the person
 * is told immediately rather than after waiting for a transfer.
 */
export function rejectAttachment(
  file: { size: number },
  existingCount: number,
): RejectionReason | null {
  if (existingCount >= MAX_ATTACHMENTS_PER_RECORD) return "too-many";
  if (file.size <= 0) return "empty";
  if (file.size > MAX_ATTACHMENT_BYTES) return "too-large";
  return null;
}

export function rejectionMessage(reason: RejectionReason, fileName: string): string {
  if (reason === "too-many")
    return `${fileName} was not attached: a modification keeps at most ${MAX_ATTACHMENTS_PER_RECORD} attachments.`;
  if (reason === "empty") return `${fileName} was not attached: the file is empty.`;
  return `${fileName} was not attached: files must be ${formatBytes(MAX_ATTACHMENT_BYTES)} or smaller.`;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

/** Whole-percent saving, floored at 0 so a stored-as-is file never reads as a negative saving. */
export function savingsPercent(size: number, storedSize: number): number {
  if (size <= 0 || storedSize >= size) return 0;
  return Math.round(((size - storedSize) / size) * 100);
}
