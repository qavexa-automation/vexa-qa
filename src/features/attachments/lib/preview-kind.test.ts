import { describe, expect, it } from "vitest";
import { originalContentType, previewKind } from "./preview-kind";
import type { Attachment } from "../types/attachment";

function attachment(overrides: Partial<Attachment>): Attachment {
  return {
    id: "a1",
    name: "shot.png",
    storedName: "shot.webp",
    contentType: "image/webp",
    size: 1000,
    storedSize: 400,
    encoding: "webp",
    path: "owner/mod/a1",
    uploadedAt: "2026-11-08T00:00:00.000Z",
    ...overrides,
  };
}

describe("attachment preview kind", () => {
  it("reads a re-encoded image as WebP whatever it was attached as", () => {
    expect(originalContentType(attachment({ name: "shot.jpg" }))).toBe("image/webp");
    expect(previewKind(attachment({ name: "shot.jpg" }))).toBe("image");
  });

  it("looks past the gzip envelope to the file name", () => {
    const gzipped = attachment({
      name: "report.pdf",
      storedName: "report.pdf",
      contentType: "application/gzip",
      encoding: "gzip",
    });
    expect(originalContentType(gzipped)).toBe("application/pdf");
    expect(previewKind(gzipped)).toBe("pdf");
  });

  it("keeps the stored type for an uncompressed file", () => {
    const stored = attachment({
      name: "notes.txt",
      storedName: "notes.txt",
      contentType: "text/plain; charset=utf-8",
      encoding: "none",
    });
    expect(originalContentType(stored)).toBe("text/plain");
    expect(previewKind(stored)).toBe("text");
  });

  it("falls back to the file name when the stored type is unspecific", () => {
    const stored = attachment({
      name: "data.json",
      storedName: "data.json",
      contentType: "application/octet-stream",
      encoding: "none",
    });
    expect(originalContentType(stored)).toBe("application/json");
    expect(previewKind(stored)).toBe("text");
  });

  it("offers anything it cannot render as a download, including SVG", () => {
    const svg = attachment({
      name: "logo.svg",
      storedName: "logo.svg",
      contentType: "image/svg+xml",
      encoding: "none",
    });
    expect(previewKind(svg)).toBe("other");
    const zip = attachment({
      name: "bundle.zip",
      storedName: "bundle.zip",
      contentType: "application/zip",
      encoding: "none",
    });
    expect(previewKind(zip)).toBe("other");
  });
});
