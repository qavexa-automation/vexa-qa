import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attachment } from "../types/attachment";
import { compressForUpload, expandForDownload } from "../lib/compress-file";
import { storedFileName } from "../lib/compression-plan";

export const ATTACHMENT_BUCKET = "modification-attachments";

/**
 * Objects are keyed by workspace owner first. The storage policies match on that leading segment,
 * so a path can never reach into another workspace's files.
 */
export function attachmentPath(
  workspaceOwner: string,
  recordId: string,
  attachmentId: string,
): string {
  return `${workspaceOwner}/${recordId}/${attachmentId}`;
}

/**
 * Compresses and uploads one file, returning the metadata the record keeps. Modifications and
 * test cases share this path and bucket; the caller saves that record, and an upload whose
 * record never saves leaves only an unreferenced object.
 */
export async function uploadAttachment(
  client: SupabaseClient,
  file: File,
  workspaceOwner: string,
  recordId: string,
): Promise<Attachment> {
  const compressed = await compressForUpload(file);
  const id = crypto.randomUUID();
  const path = attachmentPath(workspaceOwner, recordId, id);
  const { error } = await client.storage
    .from(ATTACHMENT_BUCKET)
    .upload(path, compressed.blob, { contentType: compressed.contentType, upsert: false });
  if (error) {
    // A missing bucket means the attachments migration has not been applied to this project,
    // which is worth saying outright rather than leaving "Bucket not found" to be decoded.
    const hint = /bucket not found/i.test(error.message)
      ? ` The "${ATTACHMENT_BUCKET}" bucket does not exist yet — apply supabase/migrations/20261108090000_modification_attachments.sql to this Supabase project.`
      : "";
    throw new Error(`${file.name} could not be uploaded. ${error.message}.${hint}`);
  }
  return {
    id,
    name: file.name,
    storedName: compressed.storedName || storedFileName(file.name, compressed.encoding),
    contentType: compressed.contentType,
    size: file.size,
    storedSize: compressed.blob.size,
    encoding: compressed.encoding,
    path,
    uploadedAt: new Date().toISOString(),
  };
}

/** Fetches an attachment and restores it to the bytes that were attached. */
export async function downloadAttachment(
  client: SupabaseClient,
  attachment: Attachment,
): Promise<Blob> {
  const { data, error } = await client.storage.from(ATTACHMENT_BUCKET).download(attachment.path);
  if (error || !data) throw new Error(`${attachment.name} could not be downloaded.`);
  return expandForDownload(data, attachment.encoding);
}

/**
 * Removes stored objects. Failures are reported but never block the record change, so a person is
 * not stuck with an attachment they cannot detach when storage is unreachable.
 */
export async function removeAttachments(
  client: SupabaseClient,
  attachments: Attachment[],
): Promise<void> {
  const paths = attachments.map((attachment) => attachment.path).filter(Boolean);
  if (!paths.length) return;
  const { error } = await client.storage.from(ATTACHMENT_BUCKET).remove(paths);
  if (error) throw new Error(error.message);
}
