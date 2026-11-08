import type { AttachmentEncoding } from "../types/attachment";
import {
  plannedEncoding,
  scaledSize,
  storedFileName,
  WEBP_QUALITY,
  worthCompressing,
} from "./compression-plan";

export type CompressedFile = {
  blob: Blob;
  encoding: AttachmentEncoding;
  storedName: string;
  contentType: string;
};

/**
 * Browser-only compression. Every path degrades to storing the original bytes, so an unsupported
 * browser or an undecodable file still attaches rather than failing.
 */
async function gzipFile(file: File): Promise<Blob | null> {
  if (typeof CompressionStream === "undefined") return null;
  try {
    return await new Response(file.stream().pipeThrough(new CompressionStream("gzip"))).blob();
  } catch {
    return null;
  }
}

async function reEncodeImage(file: File): Promise<Blob | null> {
  if (typeof createImageBitmap === "undefined" || typeof document === "undefined") return null;
  let bitmap: ImageBitmap | undefined;
  try {
    bitmap = await createImageBitmap(file);
    const { width, height } = scaledSize(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", WEBP_QUALITY),
    );
  } catch {
    return null;
  } finally {
    bitmap?.close();
  }
}

/** Compresses a file for upload, falling back to the original bytes whenever that is no smaller. */
export async function compressForUpload(file: File): Promise<CompressedFile> {
  const original: CompressedFile = {
    blob: file,
    encoding: "none",
    storedName: file.name,
    contentType: file.type || "application/octet-stream",
  };
  const planned = plannedEncoding(file.type);
  const compressed = planned === "webp" ? await reEncodeImage(file) : await gzipFile(file);
  if (!compressed || !worthCompressing(file.size, compressed.size)) return original;
  return {
    blob: compressed,
    encoding: planned,
    storedName: storedFileName(file.name, planned),
    contentType: planned === "webp" ? "image/webp" : "application/gzip",
  };
}

/** Restores gzipped bytes so a download hands back the file that was attached. */
export async function expandForDownload(blob: Blob, encoding: AttachmentEncoding): Promise<Blob> {
  if (encoding !== "gzip" || typeof DecompressionStream === "undefined") return blob;
  try {
    return await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).blob();
  } catch {
    return blob;
  }
}
