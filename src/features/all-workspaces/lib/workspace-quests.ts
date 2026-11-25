import type { QuestBoardIssue } from "@/components/quest-board-columns";
import { canOpenWorkspaceView } from "@/features/workspace-access";
import type { Issue, Priority, Status } from "@/lib/model";
import { modificationQuests } from "@/lib/modification-quests";

import { changeRecordStatus } from "./record-status";
import { workspaceRecords, type WorkspaceRecord, type WorkspaceSource } from "./workspace-records";

type BoardEntry = {
  issue: QuestBoardIssue;
  record: WorkspaceRecord;
  project: string;
};

export function workspaceQuests(sources: readonly WorkspaceSource[]): BoardEntry[] {
  return sources.flatMap((source) => {
    if (!canOpenWorkspaceView(source.role, "Quest board")) return [];
    const records = new Map(workspaceRecords(source).map((record) => [record.key, record]));
    const modifications = source.workspace.modifications ?? [];
    const entries: BoardEntry[] = [];
    const add = (issue: Issue, type: "Quest" | "Modification", id: string) => {
      const boardKey = JSON.stringify([source.owner, type, id]);
      const record = records.get(boardKey);
      if (record)
        entries.push({
          issue: { ...issue, boardKey, workspace: source.label },
          record,
          project: record.project || issue.title,
        });
    };
    for (const issue of source.workspace.issues) add(issue, "Quest", issue.id);
    modificationQuests(modifications).forEach((issue, index) =>
      add(issue, "Modification", modifications[index].id),
    );
    return entries;
  });
}

export function questChange(
  source: WorkspaceSource,
  record: WorkspaceRecord,
  change: { status: Status } | { priority: Priority },
) {
  if (record.owner !== source.owner || !canOpenWorkspaceView(source.role, "Quest board"))
    throw new Error("You don’t have access to edit this quest.");
  if (record.type !== "Modification" && record.type !== "Quest")
    throw new Error("This quest is no longer available.");
  if ("status" in change) return changeRecordStatus(source, record, change.status);
  const workspace = source.workspace;
  if (record.type === "Modification") {
    if (!workspace.modifications?.some((item) => item.id === record.id))
      throw new Error("This modification is no longer available.");
    return {
      ...workspace,
      modifications: workspace.modifications.map((item) =>
        item.id === record.id ? { ...item, ...change } : item,
      ),
    };
  }
  if (!workspace.issues.some((item) => item.id === record.id))
    throw new Error("This quest is no longer available.");
  return {
    ...workspace,
    issues: workspace.issues.map((item) =>
      item.id === record.id ? { ...item, priority: change.priority } : item,
    ),
  };
}
