import type { Issue, Modification, Status, Workspace } from "./model";

/** XP a modification is worth on the Quest Board at each status. */
export const MODIFICATION_XP: Record<Status, number> = {
  Backlog: 0,
  "In progress": 50,
  "In review": 0,
  Completed: 100,
};

export const MODIFICATION_LABEL = "Modification";

/** The short board ID for a modification, e.g. "MOD-3F9A21C0". */
export function modificationQuestId(modification: Pick<Modification, "id">) {
  return `MOD-${modification.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

/**
 * Modifications shown as quests on the Quest Board. These are a live view, not copies: the
 * Modification Tracker stays the source of truth, so a change on either side shows on both.
 */
export function modificationQuests(modifications: Modification[] = []): Issue[] {
  return modifications.map((modification) => ({
    id: modificationQuestId(modification),
    title: modification.projectName,
    projectId: modification.projectId || undefined,
    description: modification.description,
    status: modification.status,
    priority: modification.priority,
    type: "Task",
    assignee: modification.developer,
    xp: MODIFICATION_XP[modification.status],
    labels: [MODIFICATION_LABEL, modification.module].filter(Boolean),
    createdAt: modification.requestedAt ?? "",
  }));
}

/** The same live quest records feed the board and Overview's quest counts. */
export function questBoardIssues(workspace: Pick<Workspace, "issues" | "modifications">): Issue[] {
  return [...workspace.issues, ...modificationQuests(workspace.modifications)];
}

/** The modification behind a board quest ID, or undefined for an ordinary quest. */
export function modificationForQuest(modifications: Modification[] = [], questId: string) {
  return modifications.find((modification) => modificationQuestId(modification) === questId);
}

/** XP earned from modifications, added to the workspace's quest XP. */
export const modificationXp = (modifications: Modification[] = []) =>
  modifications.reduce((sum, modification) => sum + MODIFICATION_XP[modification.status], 0);
