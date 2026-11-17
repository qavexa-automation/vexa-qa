import { z } from "zod";
import type { Workspace } from "@/lib/model";
import { sameWorkspace } from "@/lib/workspace-merge";

export const memberRoleSchema = z.enum(["editor", "developer"]);
export const workspaceRoleSchema = z.enum(["owner", ...memberRoleSchema.options]);
export type MemberRole = z.infer<typeof memberRoleSchema>;
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

export const memberRoleOptions = [
  { value: "editor", label: "Editor", hint: "View and edit all QA records" },
  { value: "developer", label: "Developer", hint: "View modifications; edit Test Lab developer remarks only" },
];

export function canOpenWorkspaceView(role: WorkspaceRole, view: string) {
  return role !== "developer" || ["Modification Tracker", "Test lab", "Settings"].includes(view);
}

/** Developers cannot change record order, add/remove tests, or change any other field. */
export function canUpdateWorkspace(role: WorkspaceRole, before: Workspace, after: Workspace) {
  if (role !== "developer") return true;
  if (after.tests.some((test) => test.developerRemarks !== undefined && typeof test.developerRemarks !== "string")) return false;
  const withoutRemarks = (workspace: Workspace): Workspace => ({
    ...workspace,
    tests: workspace.tests.map(({ developerRemarks: _remarks, ...test }) => test),
  });
  return sameWorkspace(withoutRemarks(before), withoutRemarks(after));
}
