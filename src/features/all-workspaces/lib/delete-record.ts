import type { SupabaseClient } from "@supabase/supabase-js";

import { removeAttachments, type Attachment } from "@/features/attachments";
import type { WorkspaceRole } from "@/features/workspace-access";
import type { CloudBackend } from "@/lib/cloud-workspace";
import { deleteIssue, deleteTest, updateProjects, type Workspace } from "@/lib/model";
import { mergeWorkspaces } from "@/lib/workspace-merge";

import { workspaceRecordBackend } from "./save-record-edit";
import type { RecordType, WorkspaceRecord, WorkspaceSource } from "./workspace-records";

const collections = {
  Project: "projects",
  "Test case": "tests",
  Modification: "modifications",
  Quest: "issues",
  Deployment: "deployments",
  Activity: "calendarEvents",
} as const satisfies Record<RecordType, keyof Workspace>;

export function canDeleteRecord(role: WorkspaceRole) {
  return role === "owner" || role === "editor";
}

export async function commitRecordDeletion(
  backend: CloudBackend,
  source: WorkspaceSource,
  record: Pick<WorkspaceRecord, "id" | "owner" | "type">,
): Promise<Attachment[]> {
  if (source.owner !== record.owner || !canDeleteRecord(source.role))
    throw new Error("You don’t have access to delete this record.");

  const base = source.workspace;
  const key = collections[record.type];
  const records = base[key] ?? [];
  const saved = records.find((entry) => entry.id === record.id);
  if (!saved) throw new Error("This record is no longer available. Refresh and try again.");
  const draft =
    record.type === "Test case"
      ? deleteTest(base, record.id)
      : record.type === "Quest"
        ? deleteIssue(base, record.id)
        : record.type === "Project"
          ? updateProjects(
              base,
              (base.projects ?? []).filter((project) => project.id !== record.id),
            )
          : { ...base, [key]: records.filter((entry) => entry.id !== record.id) };

  for (let attempt = 0; attempt < 4; attempt++) {
    const latest = await backend.read();
    if (!(latest.workspace[key] ?? []).some((entry) => entry.id === record.id)) return [];
    let merged: Workspace;
    try {
      merged = mergeWorkspaces(base, draft, latest.workspace);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Both users changed"))
        throw new Error(
          "This record changed after you opened the confirmation. Refresh it before deleting.",
        );
      throw error;
    }
    try {
      await backend.save(merged, latest.revision);
    } catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "40001")
        throw error;
      continue;
    }
    if (!("attachments" in saved) || !saved.attachments?.length) return [];
    const retained = new Set(
      [...merged.tests, ...(merged.modifications ?? [])].flatMap((entry) =>
        (entry.attachments ?? []).map(({ path }) => path),
      ),
    );
    return saved.attachments.filter(
      ({ path }) => path.startsWith(`${source.owner}/${record.id}/`) && !retained.has(path),
    );
  }
  throw new Error("This workspace is busy. Refresh and try deleting again.");
}

export async function deleteWorkspaceRecord(
  client: SupabaseClient,
  userId: string,
  source: WorkspaceSource,
  record: WorkspaceRecord,
) {
  const attachments = await commitRecordDeletion(
    workspaceRecordBackend(client, userId, source),
    source,
    record,
  );
  if (!attachments.length) return;
  try {
    await removeAttachments(client, attachments);
  } catch {
    return "Record deleted. Its stored attachments couldn’t be removed.";
  }
}
