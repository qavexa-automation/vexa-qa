/** How the stored bytes differ from the file the person attached. */
export const ATTACHMENT_ENCODINGS = ["none", "webp", "gzip"] as const;
export type AttachmentEncoding = (typeof ATTACHMENT_ENCODINGS)[number];

export type Attachment = {
  id: string;
  /** The file name as attached, kept so the record still reads the way the person expects. */
  name: string;
  /** The stored object's name, which differs from `name` when an image was re-encoded. */
  storedName: string;
  /** The stored object's media type, not necessarily the original file's. */
  contentType: string;
  /** Bytes of the original file. */
  size: number;
  /** Bytes actually stored, after compression. */
  storedSize: number;
  encoding: AttachmentEncoding;
  /** Object path inside the attachments bucket. */
  path: string;
  uploadedAt: string;
};

export const MAX_ATTACHMENTS_PER_RECORD = 5;
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
