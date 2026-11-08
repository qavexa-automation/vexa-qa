import { describe, expect, it } from "vitest";
import {
  formatBytes,
  MAX_IMAGE_EDGE,
  plannedEncoding,
  rejectAttachment,
  rejectionMessage,
  savingsPercent,
  scaledSize,
  storedFileName,
  worthCompressing,
} from "./compression-plan";
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENTS_PER_RECORD } from "../types/attachment";

describe("attachment compression plan", () => {
  it("re-encodes raster images and gzips everything else", () => {
    for (const type of [
      "image/png",
      "image/jpeg",
      "image/webp",
      "IMAGE/PNG",
      "image/png; charset=binary",
    ]) {
      expect(plannedEncoding(type)).toBe("webp");
    }
    // Animation and vectors must not be flattened into a raster frame.
    for (const type of ["image/gif", "image/svg+xml", "application/pdf", "text/plain", ""]) {
      expect(plannedEncoding(type)).toBe("gzip");
    }
  });

  it("keeps compression only when it actually saves space", () => {
    expect(worthCompressing(1000, 400)).toBe(true);
    expect(worthCompressing(1000, 950)).toBe(true);
    // An already-compressed file that barely shrinks, or grows, is stored as-is.
    expect(worthCompressing(1000, 951)).toBe(false);
    expect(worthCompressing(1000, 1200)).toBe(false);
    expect(worthCompressing(0, 0)).toBe(false);
  });

  it("renames only re-encoded images, leaving gzip transparent", () => {
    expect(storedFileName("screenshot.png", "webp")).toBe("screenshot.webp");
    expect(storedFileName("my.report.v2.jpeg", "webp")).toBe("my.report.v2.webp");
    expect(storedFileName("noextension", "webp")).toBe("noextension.webp");
    expect(storedFileName("spec.pdf", "gzip")).toBe("spec.pdf");
    expect(storedFileName("spec.pdf", "none")).toBe("spec.pdf");
  });

  it("scales oversized images down by their longest edge and leaves small ones alone", () => {
    expect(scaledSize(4000, 2000)).toEqual({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE / 2 });
    expect(scaledSize(1000, 3000)).toEqual({ width: 667, height: MAX_IMAGE_EDGE });
    expect(scaledSize(800, 600)).toEqual({ width: 800, height: 600 });
    // A sliver image must never round to a zero-pixel edge.
    expect(scaledSize(10000, 1)).toEqual({ width: MAX_IMAGE_EDGE, height: 1 });
  });

  it("rejects empty, oversized, and surplus files before any upload starts", () => {
    expect(rejectAttachment({ size: 1024 }, 0)).toBeNull();
    expect(rejectAttachment({ size: 0 }, 0)).toBe("empty");
    expect(rejectAttachment({ size: MAX_ATTACHMENT_BYTES + 1 }, 0)).toBe("too-large");
    expect(rejectAttachment({ size: MAX_ATTACHMENT_BYTES }, 0)).toBeNull();
    expect(rejectAttachment({ size: 1024 }, MAX_ATTACHMENTS_PER_RECORD)).toBe("too-many");
    // The count is checked first, so a full record reports the real reason.
    expect(rejectAttachment({ size: 0 }, MAX_ATTACHMENTS_PER_RECORD)).toBe("too-many");
    expect(rejectionMessage("too-large", "big.zip")).toContain("big.zip");
  });

  it("formats sizes and savings for the cell label", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(20 * 1024)).toBe("20 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
    expect(formatBytes(-1)).toBe("—");
    expect(savingsPercent(1000, 250)).toBe(75);
    expect(savingsPercent(1000, 1000)).toBe(0);
    expect(savingsPercent(0, 0)).toBe(0);
  });
});
