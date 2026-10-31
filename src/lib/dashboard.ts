import { metrics, type Workspace } from "./model";

export function dashboardSummary(workspace: Workspace) {
  const base = metrics(workspace);
  const modifications = workspace.modifications ?? [];
  const deployments = workspace.deployments ?? [];
  const critical = workspace.issues.filter((issue) => issue.priority === "Critical");
  return {
    ...base,
    projects: workspace.projects?.length ?? 0,
    tests: workspace.tests.length,
    failedTests: workspace.tests.filter((test) => test.status === "Failed").length,
    notTested: workspace.tests.filter((test) => test.status === "Not Tested").length,
    notApplicable: workspace.tests.filter((test) => test.status === "Not Applicable").length,
    modifications: modifications.length,
    openModifications: modifications.filter((modification) => modification.status !== "Done")
      .length,
    doneModifications: modifications.filter((modification) => modification.status === "Done")
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
    criticalDone: critical.filter((issue) => issue.status === "Done").length,
    criticalXp: critical
      .filter((issue) => issue.status !== "Done")
      .reduce((sum, issue) => sum + issue.xp, 0),
    questStatuses: Object.fromEntries(
      ["Backlog", "In progress", "In review", "Done"].map((status) => [
        status,
        workspace.issues.filter((issue) => issue.status === status).length,
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
    if (issue.status === "Done") {
      developer.completed += 1;
      developer.xp += issue.xp;
    } else developer.open += 1;
  }
  for (const modification of workspace.modifications ?? []) {
    const developer = person(modification.developer);
    if (developer) developer.modifications += 1;
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
