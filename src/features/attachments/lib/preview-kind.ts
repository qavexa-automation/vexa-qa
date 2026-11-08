import type { Attachment } from "../types/attachment";

/**
 * Media types inferred from a file name. Needed because a gzipped attachment stores
 * `application/gzip` as its content type, which says nothing about the file that was attached.
 */
const TYPE_BY_EXTENSION: Record<string, string> = {
  avif: "image/avif",
  bmp: "image/bmp",
  csv: "text/csv",
  gif: "image/gif",
  heic: "image/heic",
  htm: "text/html",
  html: "text/html",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  log: "text/plain",
  md: "text/markdown",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  webp: "image/webp",
  xml: "application/xml",
  yaml: "text/yaml",
  yml: "text/yaml",
};

/** Text-ish media types that are not `text/*`. */
const TEXT_TYPES = ["application/json", "application/xml", "application/javascript"];

/** The media type of the bytes `downloadAttachment` hands back, not of the stored object. */
export function originalContentType(attachment: Attachment): string {
  if (attachment.encoding === "webp") return "image/webp";
  const stored = attachment.contentType.toLowerCase().split(";")[0].trim();
  // A gzipped object's content type describes the envelope, so fall back to the file name.
  if (attachment.encoding === "none" && stored && stored !== "application/octet-stream")
    return stored;
  const parts = attachment.name.toLowerCase().split(".");
  const extension = parts.length > 1 ? parts[parts.length - 1] : "";
  return TYPE_BY_EXTENSION[extension] ?? stored ?? "";
}

export type PreviewKind = "image" | "pdf" | "text" | "other";

/**
 * How an attachment can be shown. Anything we cannot render in place is offered as a download
 * rather than dumped into the dialog as bytes.
 */
export function previewKind(attachment: Attachment): PreviewKind {
  const type = originalContentType(attachment);
  // SVG renders as an image but is also a script container, so it is only ever offered to save.
  if (type === "image/svg+xml") return "other";
  if (type.startsWith("image/")) return "image";
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("text/") || TEXT_TYPES.includes(type)) return "text";
  return "other";
}

/** Characters of a text attachment shown in the dialog before it is clipped. */
export const TEXT_PREVIEW_LIMIT = 20_000;
