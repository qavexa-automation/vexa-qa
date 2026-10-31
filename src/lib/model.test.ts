import { describe, expect, it } from "vitest";
import {
  emptyWorkspace,
  filterTestsByProject,
  filterIssuesByProject,
  getDepartmentSection,
  isWorkspace,
  metrics,
  moveIssue,
  parseWorkspace,
  runTest,
  updateProjects,
} from "./model";
import { demoWorkspace, removeDemoTestCases } from "./seed";
import type { Modification, TestCase, Workspace } from "./model";

function testWorkspace(): Workspace {
  return {
    ...demoWorkspace(),
    tests: Array.from({ length: 10 }, (_, index): TestCase => ({
      id: `TC-${101 + index}`,
      title: `Fixture test ${index + 1}`,
      suite: "Fixture module",
      steps: "1. Execute the fixture step.",
      expected: "The fixture result is correct.",
      status: index === 0 ? "Failed" : index === 9 ? "Not Tested" : "Passed",
      lastRun: index === 9 ? null : "2026-10-26T08:00:00.000Z",
    })),
  };
}

describe("QA workspace rules", () => {
  it("filters quests by project identity while keeping All project titles inclusive", () => {
    const project = { id: "project-1", name: "VEXA", department: "IT", developer: "Jamie" };
    const other = { ...project, id: "project-2" };
    const sample = testWorkspace().issues[0];
    const issues = [
      { ...sample, id: "quest-1", projectId: project.id, title: project.name },
      { ...sample, id: "quest-2", projectId: other.id, title: other.name },
      { ...sample, id: "quest-3", title: project.name },
      { ...sample, id: "quest-4", projectId: "removed-project", title: project.name },
    ];
    expect(filterIssuesByProject(issues, [project, other], "")).toBe(issues);
    expect(
      filterIssuesByProject(issues, [project, other], project.id).map((issue) => issue.id),
    ).toEqual(["quest-1"]);
    expect(filterIssuesByProject(issues, [project], project.id).map((issue) => issue.id)).toEqual([
      "quest-1",
      "quest-3",
    ]);
    expect(filterIssuesByProject([], [project], project.id)).toEqual([]);
  });
  it("persists quest project links and follows project renames without losing old titles", () => {
    const project = { id: "project-1", name: "VEXA", department: "IT", developer: "Jamie" };
    const workspace = testWorkspace();
    workspace.projects = [project];
    workspace.issues[0] = { ...workspace.issues[0], projectId: project.id, title: project.name };
    const restored = parseWorkspace(JSON.parse(JSON.stringify(workspace)));
    expect(restored?.issues[0].projectId).toBe(project.id);
    const renamed = updateProjects(workspace, [{ ...project, name: "VEXA QA" }]);
    expect(renamed.issues[0].title).toBe("VEXA QA");
    expect(renamed.issues[0].assignee).toBe(project.developer);
    const reassigned = updateProjects(renamed, [
      { ...project, name: "VEXA QA", developer: "Chris Alvarez" },
    ]);
    expect(reassigned.issues[0].assignee).toBe("Chris Alvarez");
    expect(parseWorkspace(JSON.parse(JSON.stringify(reassigned)))?.issues[0].assignee).toBe(
      "Chris Alvarez",
    );
    expect(updateProjects(reassigned, []).issues[0].assignee).toBe("Chris Alvarez");
    expect(renamed.issues[1]).toBe(workspace.issues[1]);
    expect(workspace.issues[0].title).toBe("VEXA");
    expect(updateProjects(renamed, []).issues[0].title).toBe("VEXA QA");
    expect(
      isWorkspace({ ...workspace, issues: [{ ...workspace.issues[0], projectId: 123 }] }),
    ).toBe(false);
  });
  it("preserves modification records and accepts older workspaces without them", () => {
    const workspace = demoWorkspace();
    const modification: Modification = {
      id: "modification-1",
      projectId: "project-1",
      projectName: "VEXA",
      module: "Authentication",
      description: "Update the sign-in flow",
      priority: "High",
      status: "Backlog",
      developer: "Jamie",
      notes: "Review the mobile layout",
    };
    expect(parseWorkspace(workspace)).not.toBeNull();
    expect(
      parseWorkspace(JSON.parse(JSON.stringify({ ...workspace, modifications: [modification] })))
        ?.modifications,
    ).toEqual([modification]);
    expect(
      isWorkspace({ ...workspace, modifications: [{ ...modification, status: "Invalid" }] }),
    ).toBe(false);
    expect(
      isWorkspace({ ...workspace, modifications: [{ ...modification, priority: "Invalid" }] }),
    ).toBe(false);
    expect(isWorkspace({ ...workspace, modifications: {} })).toBe(false);
  });
  it("tracks modification project renames without losing history after deletion", () => {
    const project = { id: "project-1", name: "VEXA", department: "IT", developer: "Jamie" };
    const workspace: Workspace = {
      ...demoWorkspace(),
      projects: [project],
      modifications: [
        {
          id: "modification-1",
          projectId: project.id,
          projectName: project.name,
          module: "Authentication",
          description: "Update the sign-in flow",
          priority: "High",
          status: "In progress",
          developer: "Jamie",
          notes: "",
        },
      ],
    };
    const renamed = updateProjects(workspace, [{ ...project, name: "VEXA QA" }]);
    expect(renamed.modifications?.[0].projectName).toBe("VEXA QA");
    expect(workspace.modifications?.[0].projectName).toBe("VEXA");
    expect(updateProjects(renamed, []).modifications).toEqual(renamed.modifications);
  });
  it("starts Test Lab without built-in sample cases", () => {
    expect(demoWorkspace().tests).toEqual([]);
  });
  it("validates deployment records without requiring them in older workspaces", () => {
    const workspace = demoWorkspace();
    const deployment = {
      id: "deployment-1",
      projectId: "project-1",
      projectName: "VEXA",
      environment: "Production",
      version: "v1.0.0",
      deploymentDate: "2026-10-27",
      status: "Planned",
      notes: "First release",
    };
    expect(parseWorkspace(workspace)).not.toBeNull();
    expect(
      parseWorkspace(JSON.parse(JSON.stringify({ ...workspace, deployments: [deployment] })))
        ?.deployments,
    ).toEqual([deployment]);
    expect(isWorkspace({ ...workspace, deployments: [{ ...deployment, status: "Invalid" }] })).toBe(
      false,
    );
    expect(
      isWorkspace({ ...workspace, deployments: [{ ...deployment, environment: "Invalid" }] }),
    ).toBe(false);
    expect(isWorkspace({ ...workspace, deployments: {} })).toBe(false);
  });
  it("updates deployment project names while retaining records after a project is removed", () => {
    const project = { id: "project-1", name: "VEXA", department: "IT", developer: "Jamie" };
    const workspace: Workspace = {
      ...demoWorkspace(),
      projects: [project],
      deployments: [
        {
          id: "deployment-1",
          projectId: project.id,
          projectName: project.name,
          environment: "Staging",
          version: "v1.0.0",
          deploymentDate: "2026-10-27",
          status: "Deployed",
          notes: "",
        },
      ],
    };
    const renamed = updateProjects(workspace, [{ ...project, name: "VEXA QA" }]);
    expect(renamed.deployments?.[0].projectName).toBe("VEXA QA");
    expect(workspace.deployments?.[0].projectName).toBe("VEXA");
    expect(updateProjects(renamed, []).deployments).toEqual(renamed.deployments);
  });
  it("removes only recognized demo cases while preserving personal and linked tests", () => {
    const sample = testWorkspace().tests[0];
    const dummy = { ...sample, id: "TC-101", title: "Complete checkout with a saved card" };
    const personal = { ...dummy, id: "TC-PERSONAL" };
    const linked = { ...dummy, projectId: "personal-project" };
    const renamed = { ...dummy, title: "My own test case" };
    const workspace = { ...demoWorkspace(), tests: [dummy, personal, linked, renamed] };
    const cleaned = removeDemoTestCases(workspace);
    expect(cleaned.tests).toEqual([personal, linked, renamed]);
    expect(workspace.tests).toHaveLength(4);
    expect(removeDemoTestCases(cleaned)).toBe(cleaned);
    expect(parseWorkspace(JSON.parse(JSON.stringify(cleaned)))?.tests).toEqual(cleaned.tests);
  });
  it("calculates pass rate only from executed tests", () => {
    const result = metrics(testWorkspace());
    expect(result.run).toBe(9);
    expect(result.passed).toBe(8);
    expect(result.passRate).toBe(89);
    expect(result.done).toBe(7);
    expect(result.xp).toBe(575);
    expect(result.progress).toBe(50);
  });
  it("does not award XP twice and removes it when a quest is reopened", () => {
    const data = testWorkspace();
    const completed = moveIssue(data, "VXA-1042", "Done");
    expect(metrics(completed).xp).toBe(metrics(data).xp + 150);
    expect(moveIssue(completed, "VXA-1042", "Done")).toBe(completed);
    expect(metrics(moveIssue(completed, "VXA-1042", "In progress")).xp).toBe(metrics(data).xp);
    expect(data.issues[0].status).toBe("In progress");
  });
  it("updates a manual test result without duplicating the case", () => {
    const data = testWorkspace();
    const result = runTest(data, "TC-101", "Passed");
    expect(result.tests.length).toBe(data.tests.length);
    expect(metrics(result).passRate).toBe(100);
    expect(result.tests[0].lastRun).toBeTruthy();
    expect(data.tests[0].status).toBe("Failed");
  });
  it("resets a test to Not Tested and excludes it from executed-test metrics", () => {
    const data = testWorkspace();
    const updated = runTest(data, "TC-101", "Not Tested");
    expect(updated.tests[0].status).toBe("Not Tested");
    expect(updated.tests[0].lastRun).toBeNull();
    expect(metrics(updated).run).toBe(8);
    expect(metrics(updated).passRate).toBe(100);
    expect(updated.activity[0].text).toContain("reset to Not Tested");
    expect(runTest(updated, "TC-101", "Not Tested")).toBe(updated);
    expect(data.tests[0].status).toBe("Failed");
  });
  it("excludes Not Applicable from pass rate and clears the last execution timestamp", () => {
    const data = testWorkspace();
    const updated = runTest(data, "TC-101", "Not Applicable");
    expect(updated.tests[0].status).toBe("Not Applicable");
    expect(updated.tests[0].lastRun).toBeNull();
    expect(metrics(updated).run).toBe(8);
    expect(metrics(updated).passRate).toBe(100);
    expect(isWorkspace(updated)).toBe(true);
    const pendingOnly = {
      ...updated,
      tests: updated.tests.filter(
        (t) => t.status === "Not Applicable" || t.status === "Not Tested",
      ),
    };
    expect(metrics(pendingOnly).run).toBe(0);
    expect(metrics(pendingOnly).passRate).toBe(0);
    const passed = runTest(updated, "TC-101", "Passed");
    expect(passed.tests[0].lastRun).toBeTruthy();
    expect(metrics(passed).run).toBe(9);
  });
  it("loads legacy Not run statuses as Not Tested without changing other test details", () => {
    const data = testWorkspace();
    const legacy = {
      ...data,
      tests: data.tests.map((test, index) =>
        index === 0 ? { ...test, status: "Not run", lastRun: "2026-10-26T08:00:00.000Z" } : test,
      ),
    };
    const migrated = parseWorkspace(JSON.parse(JSON.stringify(legacy)));
    expect(migrated?.tests[0]).toEqual({ ...data.tests[0], status: "Not Tested", lastRun: null });
    expect(migrated?.tests[1]).toEqual(data.tests[1]);
    expect(legacy.tests[0].status).toBe("Not run");
    expect(
      parseWorkspace({ ...data, tests: [{ ...data.tests[0], status: "Unknown" }] }),
    ).toBeNull();
  });
  it("handles empty workspaces without NaN", () => {
    expect(metrics(emptyWorkspace())).toEqual({
      total: 0,
      done: 0,
      progress: 0,
      bugs: 0,
      critical: 0,
      passRate: 0,
      passed: 0,
      run: 0,
      xp: 0,
    });
  });
  it("rejects malformed stored data before rendering", () => {
    expect(isWorkspace(testWorkspace())).toBe(true);
    expect(isWorkspace(emptyWorkspace())).toBe(true);
    expect(isWorkspace(null)).toBe(false);
    expect(isWorkspace({ issues: [] })).toBe(false);
    const data = testWorkspace();
    expect(isWorkspace({ ...data, issues: [{ ...data.issues[0], xp: -1 }] })).toBe(false);
    expect(isWorkspace({ ...data, tests: [{ ...data.tests[0], status: "Unknown" }] })).toBe(false);
    expect(isWorkspace({ ...data, issues: [{ ...data.issues[0], labels: [null] }] })).toBe(false);
  });
  it("accepts older workspaces while validating saved project records", () => {
    const legacy = testWorkspace();
    expect(isWorkspace(legacy)).toBe(true);
    const project = {
      id: "project-1",
      name: "VEXA",
      department: "IT",
      section: "Engineering",
      developer: "Jamie",
    };
    const saved = JSON.parse(JSON.stringify({ ...legacy, projects: [project] }));
    expect(isWorkspace(saved)).toBe(true);
    const { section: _section, ...combinedProject } = project;
    expect(isWorkspace({ ...legacy, projects: [combinedProject] })).toBe(true);
    expect(isWorkspace({ ...legacy, projects: [{ ...project, section: null }] })).toBe(false);
    expect(isWorkspace({ ...legacy, projects: [{ ...project, developer: null }] })).toBe(false);
    expect(isWorkspace({ ...legacy, projects: {} })).toBe(false);
  });
  it("preserves legacy department/section values in a single field", () => {
    expect(getDepartmentSection({ department: "IT", section: "Engineering" })).toBe(
      "IT / Engineering",
    );
    expect(getDepartmentSection({ department: " IT ", section: "it" })).toBe("IT");
    expect(getDepartmentSection({ department: "Engineering" })).toBe("Engineering");
    expect(getDepartmentSection({ department: "", section: "Engineering" })).toBe("Engineering");
  });
  it("keeps linked test titles in sync with the selected project by ID", () => {
    const workspace = testWorkspace();
    const project = { id: "project-1", name: "Checkout", department: "IT", developer: "Jamie" };
    workspace.projects = [project];
    workspace.tests[0] = { ...workspace.tests[0], projectId: project.id, title: project.name };
    const updated = updateProjects(workspace, [{ ...project, name: "Checkout v2" }]);
    expect(updated.tests[0].title).toBe("Checkout v2");
    expect(updated.tests[0].projectId).toBe(project.id);
    expect(updated.tests[1]).toBe(workspace.tests[1]);
    expect(workspace.tests[0].title).toBe("Checkout");
    expect(isWorkspace(JSON.parse(JSON.stringify(updated)))).toBe(true);
    expect(isWorkspace({ ...updated, tests: [{ ...updated.tests[0], projectId: 1 }] })).toBe(false);
  });
  it("preserves historical titles when their project is removed", () => {
    const workspace = testWorkspace();
    workspace.tests[0] = { ...workspace.tests[0], projectId: "removed-project", title: "Checkout" };
    const updated = updateProjects(workspace, []);
    expect(updated.tests[0].title).toBe("Checkout");
    expect(updated.tests[0].projectId).toBe("removed-project");
    expect(updated.tests[1]).toBe(workspace.tests[1]);
  });
  it("filters tests by project ID and retains all tests in the default view", () => {
    const project = { id: "p1", name: "Checkout", department: "IT", developer: "Jamie" };
    const otherProject = { ...project, id: "p2" };
    const sample = testWorkspace().tests[0];
    const tests = [
      { ...sample, id: "t1", projectId: "p1", title: "Checkout" },
      { ...sample, id: "t2", projectId: "p2", title: "Checkout" },
      { ...sample, id: "t3", title: "Checkout" },
    ];
    expect(filterTestsByProject(tests, [project, otherProject], "")).toBe(tests);
    expect(filterTestsByProject(tests, [project, otherProject], "p1").map((t) => t.id)).toEqual([
      "t1",
    ]);
  });
  it("matches unambiguous legacy titles and keeps archived tests in All projects", () => {
    const project = { id: "p1", name: "Checkout", department: "IT", developer: "Jamie" };
    const sample = testWorkspace().tests[0];
    const tests = [
      { ...sample, id: "legacy", title: "Checkout" },
      { ...sample, id: "archived", projectId: "deleted", title: "Checkout" },
      { ...sample, id: "unlinked", title: "Unrelated test" },
    ];
    expect(filterTestsByProject(tests, [project], "p1").map((t) => t.id)).toEqual(["legacy"]);
    expect(filterTestsByProject(tests, [project], "").map((t) => t.id)).toEqual([
      "legacy",
      "archived",
      "unlinked",
    ]);
    expect(filterTestsByProject([], [project], "p1")).toEqual([]);
  });
});
