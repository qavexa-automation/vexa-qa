import type { SupabaseClient } from "@supabase/supabase-js";

import { canUpdateWorkspace } from "@/features/workspace-access";
import { CloudWorkspace, type CloudBackend } from "@/lib/cloud-workspace";
import type { Workspace } from "@/lib/model";
import { relationalBackend } from "@/lib/relational-workspace";
import { mergeWorkspaces, sameWorkspace } from "@/lib/workspace-merge";

import type { WorkspaceSource } from "./workspace-records";

export async function commitRecordEdit(backend: CloudBackend, base: Workspace, draft: Workspace) {
  const latest = await backend.read();
  const merged = sameWorkspace(base, latest.workspace)
    ? draft
    : mergeWorkspaces(base, draft, latest.workspace);
  let failure = "";
  const session = new CloudWorkspace(
    latest,
    backend,
    () => {},
    (message) => {
      failure = message;
    },
  );
  try {
    session.edit(merged);
    await session.save();
    if (!session.canSwitch)
      throw new Error(failure || "The workspace couldn’t be saved. Try again.");
  } finally {
    session.dispose();
  }
}

export async function saveRecordEdit(
  client: SupabaseClient,
  userId: string,
  source: WorkspaceSource,
  draft: Workspace,
) {
  if (!canUpdateWorkspace(source.role, source.workspace, draft))
    throw new Error("You don’t have access to save these changes.");
  const backend = workspaceRecordBackend(client, userId, source);
  try {
    await commitRecordEdit(backend, source.workspace, draft);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Both users changed")) {
      throw new Error(
        `${error.message.split(". Export your unsaved work")[0]}. Refresh or reopen the record to see the latest version.`,
      );
    }
    throw error;
  }
}

export function workspaceRecordBackend(
  client: SupabaseClient,
  userId: string,
  source: WorkspaceSource,
) {
  return relationalBackend(client, source.owner, userId, (role) => {
    if (role !== source.role)
      throw new Error("Your workspace access changed. Reopen the record and try again.");
  });
}
