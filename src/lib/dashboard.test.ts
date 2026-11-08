import { describe, expect, it } from "vitest";
import { dashboardBacklog, dashboardSummary, workspaceContributors } from "./dashboard";
import { modificationQuestId, modificationQuests } from "./modification-quests";
import { emptyWorkspace, STATUSES, type Issue, type Workspace } from "./model";
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
      issue("q1", "Completed", "pat reyes", 150, "High"),
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
        status: "Completed",
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
  it("shows backlog quests from the board and Modification Tracker in priority order", () => {
    const workspace = actualWorkspace();
    workspace.modifications![1].status = "Backlog";
    workspace.modifications![1].priority = "Critical";
    const before = JSON.stringify(workspace);

    expect(dashboardBacklog(workspace).map((issue) => issue.id)).toEqual([
      modificationQuestId(workspace.modifications![1]),
      "q3",
    ]);
    expect(dashboardBacklog(workspace).every((issue) => issue.status === "Backlog")).toBe(true);
    expect(dashboardBacklog(workspace)[0]).toMatchObject({
      title: "Second project",
      labels: ["Modification", "Search"],
      assignee: "Chris",
      xp: 0,
    });
    expect(JSON.stringify(workspace)).toBe(before);
  });

  it("searches backlog project names, descriptions, modules, and assignees without case sensitivity", () => {
    const workspace = actualWorkspace();
    workspace.modifications![1].status = "Backlog";
    for (const query of [" SECOND PROJECT ", "improve matching", "SEARCH", "chris"]) {
      expect(dashboardBacklog(workspace, query).map((issue) => issue.id)).toEqual([
        modificationQuestId(workspace.modifications![1]),
      ]);
    }
    expect(dashboardBacklog(workspace, "other person").map((issue) => issue.id)).toEqual(["q3"]);
    expect(dashboardBacklog(workspace, "no match")).toEqual([]);
    expect(dashboardBacklog(emptyWorkspace())).toEqual([]);
  });

  it("removes a backlog item from the preview as soon as its status changes", () => {
    const workspace = actualWorkspace();
    expect(dashboardBacklog(workspace).map((issue) => issue.id)).toEqual(["q3"]);
    workspace.issues[2].status = "In progress";
    expect(dashboardBacklog(workspace)).toEqual([]);
  });

  it("uses saved records from all trackers and excludes unexecuted tests from pass rate", () => {
    const summary = dashboardSummary(actualWorkspace());
    expect(summary).toMatchObject({
      projects: 2,
      total: 5,
      done: 2,
      progress: 40,
      xp: 250, // 150 from completed quests + 100 from the completed modification
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
      "In review": 1,
      Completed: 2,
    });
  });

  it("counts a completed modification when there are no standalone quests", () => {
    const workspace = emptyWorkspace();
    workspace.modifications = [actualWorkspace().modifications![0]];
    expect(dashboardSummary(workspace)).toMatchObject({
      total: 1,
      done: 1,
      progress: 100,
      xp: 100,
      questStatuses: { Backlog: 0, "In progress": 0, "In review": 0, Completed: 1 },
    });
  });

  it("matches Quest Board counts for every status and updates after status changes", () => {
    const workspace = actualWorkspace();
    workspace.modifications = STATUSES.map((status, index) => ({
      ...workspace.modifications![0],
      id: `modification-${index}`,
      status,
    }));
    const before = JSON.stringify(workspace);
    const quests = [...workspace.issues, ...modificationQuests(workspace.modifications)];
    const summary = dashboardSummary(workspace);
    expect(summary.total).toBe(quests.length);
    expect(summary.done).toBe(quests.filter((quest) => quest.status === "Completed").length);
    for (const status of STATUSES) {
      expect(summary.questStatuses[status]).toBe(quests.filter((quest) => quest.status === status).length);
    }
    expect(Object.values(summary.questStatuses).reduce((total, count) => total + count, 0)).toBe(summary.total);
    expect(summary.total - summary.done).toBe(
      summary.questStatuses.Backlog + summary.questStatuses["In progress"] + summary.questStatuses["In review"],
    );
    expect(summary.xp).toBe(300);
    expect(JSON.stringify(workspace)).toBe(before);

    workspace.modifications[0].status = "Completed";
    const updated = dashboardSummary(workspace);
    expect(updated.total).toBe(summary.total);
    expect(updated.done).toBe(summary.done + 1);
    expect(updated.questStatuses.Backlog).toBe(summary.questStatuses.Backlog - 1);
    expect(updated.questStatuses.Completed).toBe(summary.questStatuses.Completed + 1);
    workspace.modifications[0].status = "In progress";
    expect(dashboardSummary(workspace).done).toBe(summary.done);
  });

  it("supports workspaces saved before modifications were added", () => {
    const workspace = actualWorkspace();
    delete workspace.modifications;
    expect(dashboardSummary(workspace)).toMatchObject({ total: 3, done: 1, progress: 33, xp: 150 });
  });
  it("derives contributors from real assignments, merges casing, and ranks by completed XP plus modification XP", () => {
    const workspace = actualWorkspace();
    const before = JSON.stringify(workspace);
    const people = workspaceContributors(workspace);
    expect(people.map((person) => person.name)).toEqual(["Pat Reyes", "CHRIS", "Other Person"]);
    expect(people[0]).toMatchObject({
      projects: 1,
      completed: 1,
      open: 0,
      modifications: 1,
      xp: 250, // 150 from a completed quest + 100 from a completed modification
    });
    expect(people[1]).toMatchObject({
      projects: 1,
      completed: 0,
      open: 1,
      modifications: 1,
      xp: 0, // the modification is In review, worth 0
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
