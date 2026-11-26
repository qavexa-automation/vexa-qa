"use client";

import { useContext, useState } from "react";
import { toast } from "sonner";

import {
  AttachmentCell,
  downloadAttachment,
  formatBytes,
  rejectAttachment,
  rejectionMessage,
  removeAttachments,
  uploadAttachment,
  type Attachment,
} from "@/features/attachments";
import { supabase } from "@/lib/supabase";

import { canAttachToRecord, commitRecordAttachments } from "../lib/record-attachments";
import { workspaceRecordBackend } from "../lib/save-record-edit";
import type { WorkspaceRecord } from "../lib/workspace-records";
import { WorkspaceRecordsContext } from "./workspace-record-context";

/** Attachments in combined lists, saved to the record's own workspace. */
export function RecordAttachments({ record }: { record: WorkspaceRecord }) {
  const context = useContext(WorkspaceRecordsContext);
  const [busy, setBusy] = useState(false);
  const client = supabase;
  const source = context?.sources.get(record.owner);
  const editable = !!client && !!context && canAttachToRecord(source, record);
  const attachments = record.attachments ?? [];
  if (!client || (!editable && !attachments.length))
    return <span className="text-muted-foreground">—</span>;

  async function attach(files: File[]) {
    if (!client || !context || !source || busy) return;
    const accepted: File[] = [];
    for (const file of files) {
      const reason = rejectAttachment(file, attachments.length + accepted.length);
      if (reason) toast.error(rejectionMessage(reason, file.name));
      else accepted.push(file);
    }
    if (!accepted.length) return;
    setBusy(true);
    const uploaded: Attachment[] = [];
    try {
      for (const file of accepted)
        uploaded.push(await uploadAttachment(client, file, record.owner, record.id));
      await commitRecordAttachments(
        workspaceRecordBackend(client, context.userId, source),
        record,
        (current) => [...current, ...uploaded],
      );
      const saved = uploaded.reduce((total, file) => total + file.size - file.storedSize, 0);
      toast.success(
        `${uploaded.length === 1 ? uploaded[0].name : `${uploaded.length} files`} attached` +
          (saved > 0 ? ` · ${formatBytes(saved)} saved by compression` : ""),
      );
      context.refresh();
    } catch (error) {
      // Files uploaded before the failure are not on any record, so release them.
      if (uploaded.length) void removeAttachments(client, uploaded).catch(() => {});
      toast.error(error instanceof Error ? error.message : "The file could not be attached.");
    } finally {
      setBusy(false);
    }
  }

  async function detach(attachment: Attachment) {
    if (!client || !context || !source || busy) return;
    setBusy(true);
    try {
      await commitRecordAttachments(
        workspaceRecordBackend(client, context.userId, source),
        record,
        (current) => current.filter((entry) => entry.id !== attachment.id),
      );
      context.refresh();
      try {
        await removeAttachments(client, [attachment]);
        toast.success(`${attachment.name} removed`);
      } catch {
        toast.warning(
          `${attachment.name} was removed from the record, but the stored file remains.`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The file could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AttachmentCell
      attachments={attachments}
      busy={busy}
      onAdd={(files) => void attach(files)}
      onLoad={(attachment) => downloadAttachment(client, attachment)}
      onRemove={(attachment) => void detach(attachment)}
      readOnly={!editable}
      subject={`${record.name} · ${record.workspace}`}
    />
  );
}
