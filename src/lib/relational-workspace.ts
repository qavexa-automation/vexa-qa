import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyWorkspace, getDepartmentSection, parseWorkspace, type Workspace } from "./model";
import type { CloudBackend, CloudSnapshot } from "./cloud-workspace";

// Deleted projects keep readable history, while persisted foreign keys become NULL.
// The HTTP envelope is JSON; each record is stored in a typed relational table.
export function workspaceForSave(workspace: Workspace) {
  const projects = (workspace.projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    developer: project.developer,
    department: getDepartmentSection(project),
  }));
  const ids = new Set(projects.map((project) => project.id));
  const projectId = (id: string | undefined) => (id && ids.has(id) ? id : null);
  return {
    ...workspace,
    projects,
    issues: workspace.issues.map((issue) => ({
      ...issue,
      projectId: projectId(issue.projectId),
      labels: [...new Set(issue.labels.map((label) => label.trim()).filter(Boolean))],
    })),
    tests: workspace.tests.map((test) => ({ ...test, projectId: projectId(test.projectId) })),
    modifications: (workspace.modifications ?? []).map((modification) => ({
      ...modification,
      projectId: projectId(modification.projectId),
    })),
    deployments: (workspace.deployments ?? []).map((deployment) => ({
      ...deployment,
      projectId: projectId(deployment.projectId),
    })),
  };
}

export function parseCloudSnapshot(value: unknown, ownWorkspace: boolean): CloudSnapshot {
  if (value === null) {
    if (!ownWorkspace)
      throw new Error("This shared workspace is unavailable or your access was removed.");
    return { workspace: emptyWorkspace(), revision: 0 };
  }
  if (!value || typeof value !== "object" || !("revision" in value) || !("workspace" in value))
    throw new Error("The database returned an unsupported workspace format.");
  const revision = Number(value.revision);
  const workspace = parseWorkspace(value.workspace);
  if (!workspace || !Number.isSafeInteger(revision) || revision < 1)
    throw new Error(
      "The saved workspace has an unsupported format. Export a backup before making changes.",
    );
  return { workspace, revision };
}

export function relationalBackend(
  client: SupabaseClient,
  workspaceOwner: string,
  userId: string,
): CloudBackend {
  return {
    read: async () => {
      const result = await client.rpc("read_qa_workspace", { workspace_owner: workspaceOwner });
      if (result.error)
        throw Object.assign(new Error(result.error.message), {
          retryable: result.status === 0 || result.status >= 500,
        });
      return parseCloudSnapshot(result.data, workspaceOwner === userId);
    },
    save: async (workspace, revision) => {
      const result = await client.rpc("save_qa_workspace", {
        payload: workspaceForSave(workspace),
        expected_revision: revision,
        workspace_owner: workspaceOwner,
      });
      if (result.error)
        throw Object.assign(new Error(result.error.message), { code: result.error.code });
      const nextRevision = Number(result.data);
      if (!Number.isSafeInteger(nextRevision) || nextRevision < 1)
        throw new Error("The database returned an invalid save revision. Reload before editing.");
      return nextRevision;
    },
  };
}
