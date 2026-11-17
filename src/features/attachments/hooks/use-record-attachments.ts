"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatBytes, rejectAttachment, rejectionMessage } from "../lib/compression-plan";
import {
  downloadAttachment,
  removeAttachments,
  uploadAttachment,
} from "../services/attachment-storage";
import type { Attachment } from "../types/attachment";

/**
 * Attaching and detaching files on one kind of record. The caller owns how the record is stored,
 * so this hook only compresses, uploads, and reports; `onChange` applies the new list.
 *
 * Modifications and test cases share a bucket and the same owner-prefixed object paths, so the
 * same storage policies confine both.
 */
export function useRecordAttachments({
  workspaceOwner,
  readOnly = false,
  onNotice,
  onChange,
}: {
  /** The signed-in workspace owner. Without one there is no storage to hold attachments. */
  workspaceOwner?: string;
  readOnly?: boolean;
  onNotice: (message: string) => void;
  /** Replaces one record's attachment list, reading from the latest state rather than a copy. */
  onChange: (recordId: string, next: (current: Attachment[]) => Attachment[]) => void;
}) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const canAttach = !readOnly && !!supabase && !!workspaceOwner;

  async function attach(recordId: string, existing: Attachment[], files: File[]) {
    if (!canAttach || !supabase || !workspaceOwner || uploadingId) return;
    const accepted: File[] = [];
    for (const file of files) {
      const reason = rejectAttachment(file, existing.length + accepted.length);
      if (reason) onNotice(rejectionMessage(reason, file.name));
      else accepted.push(file);
    }
    if (!accepted.length) return;
    setUploadingId(recordId);
    const uploaded: Attachment[] = [];
    try {
      for (const file of accepted) {
        uploaded.push(await uploadAttachment(supabase, file, workspaceOwner, recordId));
      }
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "The file could not be attached.");
    } finally {
      setUploadingId(null);
    }
    if (!uploaded.length) return;
    onChange(recordId, (current) => [...current, ...uploaded]);
    const saved = uploaded.reduce(
      (total, attachment) => total + (attachment.size - attachment.storedSize),
      0,
    );
    onNotice(
      `${uploaded.length === 1 ? uploaded[0].name : `${uploaded.length} files`} attached` +
        (saved > 0 ? ` · ${formatBytes(saved)} saved by compression` : ""),
    );
  }

  async function detach(recordId: string, attachment: Attachment) {
    if (readOnly) return;
    // The record is updated even when the object cannot be deleted, so a person is never stuck
    // with an attachment they cannot remove; the orphaned object is reported instead.
    onChange(recordId, (current) => current.filter((entry) => entry.id !== attachment.id));
    try {
      if (supabase) await removeAttachments(supabase, [attachment]);
      onNotice(`${attachment.name} removed`);
    } catch {
      onNotice(`${attachment.name} was removed from the record, but the stored file remains.`);
    }
  }

  async function load(attachment: Attachment): Promise<Blob> {
    if (!supabase) throw new Error("Sign in to preview attachments in your cloud workspace.");
    return downloadAttachment(supabase, attachment);
  }

  return { uploadingId, canAttach, attach, detach, load };
}
