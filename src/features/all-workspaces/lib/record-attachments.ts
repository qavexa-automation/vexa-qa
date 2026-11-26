import type { Attachment } from "@/features/attachments";
import type { CloudBackend } from "@/lib/cloud-workspace";
import type { Workspace } from "@/lib/model";

import { canDeleteRecord } from "./delete-record";
import type { WorkspaceRecord, WorkspaceSource } from "./workspace-records";

type AttachableRecord = Pick<WorkspaceRecord, "id" | "owner" | "type">;
type AttachmentUpdate = (current: Attachment[]) => Attachment[];

/** Owners and Editors attach files in combined lists; Developers only preview them. */
export function canAttachToRecord(source: WorkspaceSource | undefined, record: AttachableRecord) {
  return (
    !!source &&
    source.owner === record.owner &&
    canDeleteRecord(source.role) &&
    (record.type === "Test case" || record.type === "Modification")
  );
}

/** The workspace with one record's attachment list replaced, or null when the record is gone. */
export function withRecordAttachments(
  workspace: Workspace,
  record: AttachableRecord,
  update: AttachmentUpdate,
): Workspace | null {
  if (record.type === "Test case") {
    if (!workspace.tests.some((test) => test.id === record.id)) return null;
    return {
      ...workspace,
      tests: workspace.tests.map((test) =>
        test.id === record.id ? { ...test, attachments: update(test.attachments ?? []) } : test,
      ),
    };
  }
  if (record.type === "Modification") {
    const modifications = workspace.modifications ?? [];
    if (!modifications.some((entry) => entry.id === record.id)) return null;
    return {
      ...workspace,
      modifications: modifications.map((entry) =>
        entry.id === record.id ? { ...entry, attachments: update(entry.attachments ?? []) } : entry,
      ),
    };
  }
  return null;
}

/**
 * Saves an attachment change against the latest copy of the source workspace, so a teammate's
 * concurrent edits are kept. A revision conflict re-reads and tries again.
 */
export async function commitRecordAttachments(
  backend: CloudBackend,
  record: AttachableRecord,
  update: AttachmentUpdate,
) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const latest = await backend.read();
    const next = withRecordAttachments(latest.workspace, record, update);
    if (!next) throw new Error("This record is no longer available. Refresh and try again.");
    try {
      await backend.save(next, latest.revision);
      return;
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "40001")
        throw error;
    }
  }
  throw new Error("This workspace is busy. Refresh and try again.");
}
