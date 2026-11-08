import { metrics, PRIORITIES, STATUSES, type Workspace } from "./model";
import { MODIFICATION_XP, questBoardIssues } from "./modification-quests";

export function dashboardBacklog(workspace: Workspace, search = "") {
  const query = search.trim().toLowerCase();
  return questBoardIssues(workspace)
    .filter(
      (issue) =>
        issue.status === "Backlog" &&
        `${issue.id} ${issue.title} ${issue.description} ${issue.assignee} ${issue.labels.join(" ")}`
          .toLowerCase()
          .includes(query),
    )
    .sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority));
}

export function dashboardSummary(workspace: Workspace) {
  const base = metrics(workspace);
  const quests = questBoardIssues(workspace);
  const done = quests.filter((quest) => quest.status === "Completed").length;
  const modifications = workspace.modifications ?? [];
  const deployments = workspace.deployments ?? [];
  const critical = workspace.issues.filter((issue) => issue.priority === "Critical");
  return {
    ...base,
    total: quests.length,
    done,
    progress: quests.length ? Math.round((done / quests.length) * 100) : 0,
    projects: workspace.projects?.length ?? 0,
    tests: workspace.tests.length,
    failedTests: workspace.tests.filter((test) => test.status === "Failed").length,
    notTested: workspace.tests.filter((test) => test.status === "Not Tested").length,
    notApplicable: workspace.tests.filter((test) => test.status === "Not Applicable").length,
    modifications: modifications.length,
    openModifications: modifications.filter((modification) => modification.status !== "Completed")
      .length,
    doneModifications: modifications.filter((modification) => modification.status === "Completed")
      .length,
    deployments: deployments.length,
    deployed: deployments.filter((deployment) => deployment.status === "Deployed").length,
    failedDeployments: deployments.filter((deployment) => deployment.status === "Failed").length,
    plannedDeployments: deployments.filter((deployment) => deployment.status === "Planned").length,
    activeDeployments: deployments.filter((deployment) => deployment.status === "In progress")
      .length,
    rolledBackDeployments: deployments.filter((deployment) => deployment.status === "Rolled back")
      .length,
    criticalTotal: critical.length,
    criticalDone: critical.filter((issue) => issue.status === "Completed").length,
    criticalXp: critical
      .filter((issue) => issue.status !== "Completed")
      .reduce((sum, issue) => sum + issue.xp, 0),
    questStatuses: Object.fromEntries(
      STATUSES.map((status) => [
        status,
        quests.filter((quest) => quest.status === status).length,
      ]),
    ),
  };
}

export function workspaceContributors(workspace: Workspace) {
  const people = new Map<
    string,
    {
      name: string;
      projects: number;
      completed: number;
      open: number;
      xp: number;
      modifications: number;
      role: string;
    }
  >();
  const person = (name: string) => {
    const clean = name.trim();
    if (!clean) return null;
    const key = clean.toLowerCase();
    if (!people.has(key))
      people.set(key, {
        name: clean,
        projects: 0,
        completed: 0,
        open: 0,
        xp: 0,
        modifications: 0,
        role: "",
      });
    return people.get(key)!;
  };
  for (const project of workspace.projects ?? []) {
    const developer = person(project.developer);
    if (developer) developer.projects += 1;
  }
  for (const issue of workspace.issues) {
    const developer = person(issue.assignee);
    if (!developer) continue;
    if (issue.status === "Completed") {
      developer.completed += 1;
      developer.xp += issue.xp;
    } else developer.open += 1;
  }
  for (const modification of workspace.modifications ?? []) {
    const developer = person(modification.developer);
    if (!developer) continue;
    developer.modifications += 1;
    // Same status legend as the Quest Board: In progress 50, Completed 100, others 0.
    developer.xp += MODIFICATION_XP[modification.status];
  }
  return [...people.values()]
    .map((developer) => ({
      ...developer,
      role: `${developer.projects} projects · ${developer.open} open quests · ${developer.modifications} modifications`,
    }))
    .sort(
      (a, b) =>
        b.xp - a.xp || b.completed - a.completed || b.open - a.open || a.name.localeCompare(b.name),
    );
}
