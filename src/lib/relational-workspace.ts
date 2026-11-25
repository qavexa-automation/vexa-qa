import type { SupabaseClient } from "@supabase/supabase-js";
import { emptyWorkspace, getDepartmentSection, parseWorkspace, type Workspace } from "./model";
import type { CloudBackend, CloudSnapshot } from "./cloud-workspace";
import { workspaceLabel } from "@/features/profile";
import { workspaceRoleSchema, type WorkspaceRole } from "@/features/workspace-access";

// Deleted projects keep readable history, while persisted foreign keys become NULL.
// The HTTP envelope is JSON; each record is stored in a typed relational table.
export function workspaceForSave(workspace: Workspace) {
  const projects = (workspace.projects ?? []).map((project) => ({
    id: project.id,
    name: project.name,
    developer: project.developer,
    status: project.status ?? "Not Started",
    department: getDepartmentSection(project),
  }));
  const ids = new Set(projects.map((project) => project.id));
  const projectId = (id: string | undefined) => (id && ids.has(id) ? id : null);
  return {
    ...workspace,
    ...(workspace.calendarEvents !== undefined && {
      calendarEvents: workspace.calendarEvents.map((event) => ({
        ...event, projectId: projectId(event.projectId),
      })),
    }),
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

export type SharedWorkspace = { owner: string; label: string };

async function listJoinedOwners(client: SupabaseClient, userId: string): Promise<string[]> {
  const { data, error } = await client
    .from("qa_workspace_members")
    .select("workspace_owner")
    .eq("member_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map(({ workspace_owner: owner }) => owner);
}

/** Joined workspaces, each named after its owner. */
export async function listSharedWorkspaces(client: SupabaseClient, userId: string) {
  const [owners, names] = await Promise.all([
    listJoinedOwners(client, userId),
    client.rpc("list_qa_workspace_names"),
  ]);
  // Names are cosmetic: without them (or before their migration is applied) access still works.
  const nameByOwner = new Map<string, unknown>(
    names.error || !Array.isArray(names.data)
      ? []
      : names.data.map((row) => [row.workspace_owner, row.owner_name]),
  );
  return owners.map((owner): SharedWorkspace => {
    const name = nameByOwner.get(owner);
    return {
      owner,
      label: (typeof name === "string" && workspaceLabel(name)) || `Team workspace ${owner.slice(0, 8)}`,
    };
  });
}

/** Use the established shared workspace even when a teammate is browsing their own. */
export async function readTeamCalendarWorkspace(client: SupabaseClient, userId: string, ownLabel: string): Promise<SharedWorkspace> {
  const [joined, owned] = await Promise.all([
    listJoinedOwners(client, userId),
    client.from("qa_workspace_members").select("workspace_owner").eq("workspace_owner", userId).limit(1),
  ]);
  if (owned.error) throw new Error(owned.error.message);
  const teamOwners = [...joined];
  if (owned.data?.length) teamOwners.push(userId);
  if (!teamOwners.length) return { owner: userId, label: ownLabel };

  // All members with access to the original team converge on the same workspace.
  const { data, error } = await client.from("qa_workspaces")
    .select("user_id")
    .in("user_id", teamOwners)
    .order("created_at")
    .order("user_id")
    .limit(1)
    .maybeSingle();
  if (error || !data) throw new Error("The shared team calendar couldn’t be found.");
  return { owner: data.user_id, label: "Shared team calendar" };
}

export async function readRelationalWorkspace(
  client: SupabaseClient,
  workspaceOwner: string,
  userId: string,
): Promise<{ snapshot: CloudSnapshot; role: WorkspaceRole }> {
  const result = await client.rpc("read_qa_workspace", { workspace_owner: workspaceOwner });
  if (result.error)
    throw Object.assign(new Error(result.error.message), {
      retryable: result.status === 0 || result.status >= 500,
    });
  const ownWorkspace = workspaceOwner === userId;
  const snapshot = parseCloudSnapshot(result.data, ownWorkspace);
  if (ownWorkspace) return { snapshot, role: "owner" };

  const role = workspaceRoleSchema.safeParse(result.data?.role);
  if (!role.success || role.data === "owner")
    throw new Error("Unable to verify workspace permissions. Apply the developer access migration.");
  return { snapshot, role: role.data };
}

export function relationalBackend(
  client: SupabaseClient,
  workspaceOwner: string,
  userId: string,
  onRole?: (role: WorkspaceRole) => void,
): CloudBackend {
  let role: WorkspaceRole = workspaceOwner === userId ? "owner" : "developer";
  return {
    read: async () => {
      const { snapshot, role: currentRole } = await readRelationalWorkspace(client, workspaceOwner, userId);
      role = currentRole;
      onRole?.(role);
      return snapshot;
    },
    save: async (workspace, revision) => {
      const result = await client.rpc(role === "developer" ? "save_qa_developer_remarks" : "save_qa_workspace", {
        payload: role === "developer"
          ? workspace.tests.map((test) => ({ id: test.id, developerRemarks: test.developerRemarks ?? "" }))
          : workspaceForSave(workspace),
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
