import { describe, expect, it } from "vitest";

import { emptyWorkspace, type Workspace } from "@/lib/model";

import { workspaceRecords, workspaceRecordTypeForView } from "./workspace-records";

function fixture(project: string): Workspace {
  return {
    ...emptyWorkspace(),
    projects: [{ id: "project-1", name: project, department: "QA", developer: "Ana" }],
    tests: [
      {
        id: "TC-001",
        title: project,
        projectId: "project-1",
        suite: "Sign-in",
        steps: "Enter a valid password.",
        expected: "The dashboard loads.",
        developerRemarks: "Ready for a retest.",
        status: "Passed",
        lastRun: null,
      },
    ],
    modifications: [
      {
        id: "MOD-001",
        projectId: "project-1",
        projectName: project,
        module: "Sign-in",
        description: "Update validation.",
        notes: "Verify regression.",
        priority: "High",
        status: "In progress",
        developer: "Ana",
      },
    ],
    issues: [
      {
        id: "VXA-001",
        title: "Regression checks",
        projectId: "project-1",
        description: "Run QA suite.",
        status: "Backlog",
        priority: "Medium",
        type: "Task",
        assignee: "Ana",
        xp: 100,
        labels: [],
        createdAt: "2026-11-25T04:00:00Z",
      },
    ],
  };
}

describe("Records across workspaces", () => {
  it("keeps matching record IDs and their project links separate across workspaces", () => {
    const rows = [
      { owner: "own", label: "My workspace", role: "owner", workspace: fixture("Portal") },
      { owner: "team", label: "Team workspace", role: "editor", workspace: fixture("Checkout") },
    ] as const;
    const tests = rows.flatMap((source) => workspaceRecords(source, "Test case"));

    expect(new Set(tests.map((test) => test.key)).size).toBe(2);
    expect(tests.map(({ workspace, project, module }) => ({ workspace, project, module }))).toEqual(
      [
        { workspace: "My workspace", project: "Portal", module: "Sign-in" },
        { workspace: "Team workspace", project: "Checkout", module: "Sign-in" },
      ],
    );
    expect(tests[0].fields).toEqual(
      expect.arrayContaining([
        { label: "Test details", value: "Enter a valid password." },
        { label: "Expected result", value: "The dashboard loads." },
        { label: "Developer remarks", value: "Ready for a retest." },
      ]),
    );
  });

  it("applies each workspace’s role independently", () => {
    const workspace = fixture("Portal");
    const personal = workspaceRecords({
      owner: "own",
      label: "My workspace",
      role: "owner",
      workspace,
    });
    const team = workspaceRecords({
      owner: "team",
      label: "Team workspace",
      role: "developer",
      workspace,
    });

    expect(personal.map(({ type }) => type)).toEqual([
      "Project",
      "Test case",
      "Modification",
      "Quest",
    ]);
    expect(team.map(({ type }) => type)).toEqual(["Test case", "Modification"]);
    expect(
      workspaceRecords(
        {
          owner: "team",
          label: "Q2",
          role: "developer",
          workspace,
        },
        "Project",
      ),
    ).toEqual([]);
  });

  it("combines only the selected module’s records from QA and Q2", () => {
    const qa = fixture("Portal");
    const q2 = fixture("Portal");
    q2.tests[0] = {
      ...q2.tests[0],
      steps: "Verify the renewal flow.",
      expected: "The plan renews.",
    };
    const sources = [
      { owner: "qa", label: "QA", role: "owner", workspace: qa },
      { owner: "q2", label: "Q2", role: "editor", workspace: q2 },
    ] as const;
    const type = workspaceRecordTypeForView("Test lab");
    expect(type).toBe("Test case");
    const rows = sources.flatMap((source) => workspaceRecords(source, type));
    expect(rows.map(({ owner, type, project }) => ({ owner, type, project }))).toEqual([
      { owner: "qa", type: "Test case", project: "Portal" },
      { owner: "q2", type: "Test case", project: "Portal" },
    ]);
    expect(
      rows.map((row) => row.fields.find((field) => field.label === "Expected result")?.value),
    ).toEqual(["The dashboard loads.", "The plan renews."]);
    expect(workspaceRecordTypeForView("Settings")).toBeUndefined();
  });
});
