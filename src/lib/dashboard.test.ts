import { describe, expect, it } from "vitest";
import { dashboardSummary, workspaceContributors } from "./dashboard";
import { emptyWorkspace, type Issue, type Workspace } from "./model";
import { demoWorkspace, removeUntouchedDemoData } from "./seed";

function actualWorkspace(): Workspace {
  const issue = (
    id: string,
    status: Issue["status"],
    assignee: string,
    xp: number,
    priority: Issue["priority"],
  ): Issue => ({
    id,
    title: "Actual project",
    projectId: "p1",
    description: "User-entered quest",
    type: "Bug",
    status,
    assignee,
    xp,
    priority,
    labels: [],
    createdAt: "2026-10-29T00:00:00Z",
  });
  return {
    ...emptyWorkspace(),
    projects: [
      { id: "p1", name: "Actual project", department: "IT", developer: "Pat Reyes" },
      { id: "p2", name: "Second project", department: "Operations", developer: "CHRIS" },
    ],
    issues: [
      issue("q1", "Done", "pat reyes", 150, "High"),
      issue("q2", "In progress", "Chris", 200, "Critical"),
      issue("q3", "Backlog", "Other Person", 75, "High"),
    ],
    tests: ["Passed", "Failed", "Not Applicable", "Not Tested"].map((status, index) => ({
      id: `t${index}`,
      projectId: "p1",
      title: "Actual project",
      suite: "Accounts",
      steps: "Execute the saved steps",
      expected: "Expected result",
      status: status as Workspace["tests"][number]["status"],
      lastRun: null,
    })),
    modifications: [
      {
        id: "m1",
        projectId: "p1",
        projectName: "Actual project",
        module: "Accounts",
        description: "Update validation",
        developer: "Pat Reyes",
        status: "Done",
        priority: "High",
        notes: "",
      },
      {
        id: "m2",
        projectId: "p2",
        projectName: "Second project",
        module: "Search",
        description: "Improve matching",
        developer: "Chris",
        status: "In review",
        priority: "Medium",
        notes: "",
      },
    ],
    deployments: ["Planned", "In progress", "Deployed", "Failed", "Rolled back"].map(
      (status, index) => ({
        id: `d${index}`,
        projectId: "p1",
        projectName: "Actual project",
        environment: "Staging",
        version: `v${index}`,
        deploymentDate: "2026-10-29",
        status: status as NonNullable<Workspace["deployments"]>[number]["status"],
        notes: "",
      }),
    ),
  };
}

describe("actual workspace dashboard", () => {
  it("uses saved records from all trackers and excludes unexecuted tests from pass rate", () => {
    const summary = dashboardSummary(actualWorkspace());
    expect(summary).toMatchObject({
      projects: 2,
      total: 3,
      done: 1,
      progress: 33,
      xp: 150,
      bugs: 2,
      critical: 1,
      tests: 4,
      run: 2,
      passed: 1,
      passRate: 50,
      failedTests: 1,
      notTested: 1,
      notApplicable: 1,
      modifications: 2,
      openModifications: 1,
      doneModifications: 1,
      deployments: 5,
      deployed: 1,
      failedDeployments: 1,
      plannedDeployments: 1,
      activeDeployments: 1,
      rolledBackDeployments: 1,
      criticalTotal: 1,
      criticalDone: 0,
      criticalXp: 200,
    });
    expect(summary.questStatuses).toEqual({
      Backlog: 1,
      "In progress": 1,
      "In review": 0,
      Done: 1,
    });
  });
  it("derives contributors from real assignments, merges casing, and ranks by completed XP", () => {
    const workspace = actualWorkspace();
    const before = JSON.stringify(workspace);
    const people = workspaceContributors(workspace);
    expect(people.map((person) => person.name)).toEqual(["Pat Reyes", "CHRIS", "Other Person"]);
    expect(people[0]).toMatchObject({
      projects: 1,
      completed: 1,
      open: 0,
      modifications: 1,
      xp: 150,
    });
    expect(people[1]).toMatchObject({
      projects: 1,
      completed: 0,
      open: 1,
      modifications: 1,
      xp: 0,
    });
    expect(JSON.stringify(workspace)).toBe(before);
  });
  it("starts at zero without fake contributors or success rates", () => {
    expect(dashboardSummary(emptyWorkspace())).toMatchObject({
      projects: 0,
      total: 0,
      xp: 0,
      tests: 0,
      run: 0,
      passRate: 0,
      modifications: 0,
      deployments: 0,
      criticalTotal: 0,
    });
    expect(workspaceContributors(emptyWorkspace())).toEqual([]);
  });
  it("removes untouched sample quests while retaining edited, linked, and personal records", () => {
    const original = demoWorkspace();
    const edited = { ...original.issues[0], description: "My own acceptance criteria" };
    const linked = { ...original.issues[1], projectId: "p1" };
    const personal = { ...original.issues[0], id: "VXA-real", title: "Actual project" };
    const workspace: Workspace = {
      ...original,
      issues: [edited, linked, ...original.issues.slice(2), personal],
      projects: actualWorkspace().projects,
      deployments: actualWorkspace().deployments,
      modifications: actualWorkspace().modifications,
      activity: [
        ...original.activity,
        {
          id: "real-event",
          kind: "issue",
          text: "User changed a quest",
          date: "2026-10-29T00:00:00Z",
        },
      ],
    };
    const cleaned = removeUntouchedDemoData(workspace);
    expect(cleaned.issues).toEqual([edited, linked, personal]);
    expect(cleaned.projects).toBe(workspace.projects);
    expect(cleaned.modifications).toBe(workspace.modifications);
    expect(cleaned.deployments).toBe(workspace.deployments);
    expect(cleaned.activity.map((event) => event.id)).toEqual(["real-event"]);
    expect(workspace.issues).toHaveLength(15);
    expect(removeUntouchedDemoData(cleaned)).toBe(cleaned);
    expect(removeUntouchedDemoData(demoWorkspace()).issues).toEqual([]);
  });
});
