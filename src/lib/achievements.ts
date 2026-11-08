import type { Workspace } from "./model";
import { questBoardIssues } from "./modification-quests";

/** Read current saved statuses, including modifications, without depending on the activity log. */
export function firstBloodAchievement(workspace: Workspace) {
  return {
    title: "First blood",
    description: "Complete your first quest or modification.",
    count: questBoardIssues(workspace).filter((quest) => quest.status === "Completed").length,
    goal: 1,
  };
}
