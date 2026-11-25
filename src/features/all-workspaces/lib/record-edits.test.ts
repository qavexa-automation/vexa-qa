import { describe, expect, it, vi } from "vitest";

import { canUpdateWorkspace } from "@/features/workspace-access";
import { emptyWorkspace, type Workspace } from "@/lib/model";

import { createRecordEdit, type RecordEdit } from "./record-edits";
import { commitRecordEdit } from "./save-record-edit";

function fixture(): Workspace {
  return {
    ...emptyWorkspace(),
    projects: [{ id: "P1", name: "Portal", department: "QA", developer: "Ana" }],
    issues: [
      {
        id: "Q1",
        projectId: "P1",
        title: "Portal",
        assignee: "Ana",
        description: "Run regression checks",
        status: "Backlog",
        priority: "Low",
        type: "Task",
        labels: [],
        xp: 100,
        createdAt: "2026-11-25T00:00:00Z",
      },
    ],
    tests: [
      {
        id: "T1",
        projectId: "P1",
        title: "Portal",
        suite: "Sign-in",
        steps: "Sign in",
        expected: "Dashboard",
        status: "Not Tested",
        lastRun: null,
        attachments: [],
      },
    ],
    modifications: [
      {
        id: "M1",
        projectId: "P1",
        projectName: "Portal",
        module: "Sign-in",
        description: "Validation",
        priority: "Low",
        status: "Backlog",
        developer: "Ana",
        notes: "",
      },
    ],
    deployments: [
      {
        id: "D1",
        projectId: "P1",
        projectName: "Portal",
        environment: "Production",
        version: "1.0",
        deploymentDate: "2026-11-25",
        status: "Planned",
        notes: "",
      },
    ],
    calendarEvents: [
      {
        id: "A1",
        projectId: "P1",
        title: "Release",
        kind: "Release",
        status: "Scheduled",
        startDate: "2026-11-25",
        endDate: "2026-11-25",
        allDay: false,
        startTime: "09:00",
        endTime: "10:00",
        location: "",
        notes: "",
      },
    ],
  };
}

const apply = (edit: RecordEdit, values: Record<string, string>) =>
  edit.apply({ ...edit.initial, ...values });

describe("Editing records across workspaces", () => {
  it("updates projects and their linked record names using the same workspace rule", () => {
    const workspace = fixture();
    const next = apply(createRecordEdit(workspace, "editor", "Project", "P1"), {
      name: "Checkout",
    });
    expect(next.projects?.[0].name).toBe("Checkout");
    expect(next.tests[0].title).toBe("Checkout");
    expect(next.modifications?.[0].projectName).toBe("Checkout");
    expect(next.issues[0].title).toBe("Checkout");
    expect(next.deployments?.[0].projectName).toBe("Checkout");
    expect(workspace.projects?.[0].name).toBe("Portal");
  });

  it("saves QA details and records a test result without losing attachments", () => {
    const workspace = fixture();
    const edit = createRecordEdit(workspace, "editor", "Test case", "T1");
    const next = apply(edit, { expected: "Members page", status: "Passed" });
    expect(next.tests[0]).toMatchObject({
      expected: "Members page",
      status: "Passed",
      attachments: [],
    });
    expect(next.tests[0].lastRun).toBeTruthy();
    expect(next.activity[0].kind).toBe("test");
    expect(() => apply(edit, { expected: " " })).toThrow(/expected result/i);
    expect(() => apply(edit, { projectId: "other-workspace-project" })).toThrow(/this workspace/);
  });

  it("keeps Developer editing restricted to the remarks field", () => {
    const workspace = fixture();
    const edit = createRecordEdit(workspace, "developer", "Test case", "T1");
    expect(edit.fields.map(({ name }) => name)).toEqual(["developerRemarks"]);
    const next = apply(edit, { developerRemarks: "Ready for retest", status: "Passed" });
    expect(next.tests[0]).toMatchObject({
      developerRemarks: "Ready for retest",
      status: "Not Tested",
    });
    expect(canUpdateWorkspace("developer", workspace, next)).toBe(true);
    expect(() => createRecordEdit(workspace, "developer", "Modification", "M1")).toThrow(
      /edit access/i,
    );
  });

  it("saves quest, modification, deployment, and calendar fields with their existing rules", () => {
    const workspace = fixture();
    const quest = apply(createRecordEdit(workspace, "editor", "Quest", "Q1"), {
      status: "Completed",
      xp: "150",
    });
    expect(quest.issues[0]).toMatchObject({ status: "Completed", xp: 150 });
    expect(quest.activity[0].text).toContain("150 XP earned");
    const modification = createRecordEdit(workspace, "editor", "Modification", "M1");
    expect(apply(modification, { notes: "Retested" }).modifications?.[0].notes).toBe("Retested");
    expect(() =>
      apply(modification, { requestedAt: "2026-11-25", modifiedAt: "2026-11-24" }),
    ).toThrow(/cannot be before/);
    const deployment = createRecordEdit(workspace, "editor", "Deployment", "D1");
    expect(apply(deployment, { version: "2.0" }).deployments?.[0].version).toBe("2.0");
    expect(() => apply(deployment, { deploymentDate: "2026-11-31" })).toThrow(/valid date/);
    const event = createRecordEdit(workspace, "editor", "Activity", "A1");
    expect(apply(event, { timing: "All day" }).calendarEvents?.[0]).toMatchObject({
      allDay: true,
      startTime: "",
      endTime: "",
    });
    expect(() => apply(event, { endTime: "08:00" })).toThrow(/must be after/);
  });
});

describe("Saving an edit against the source revision", () => {
  it("merges independent changes made before and during a save attempt", async () => {
    const base = fixture();
    const draft = apply(createRecordEdit(base, "editor", "Test case", "T1"), { suite: "Payments" });
    const latest = structuredClone(base);
    latest.tests[0].steps = "Sign in as an editor";
    const concurrentlySaved = structuredClone(latest);
    concurrentlySaved.tests[0].developerRemarks = "Retest on Monday";
    const save = vi
      .fn()
      .mockRejectedValueOnce(Object.assign(new Error("Workspace changed"), { code: "40001" }))
      .mockResolvedValueOnce(4);
    const read = vi
      .fn()
      .mockResolvedValueOnce({ workspace: latest, revision: 2 })
      .mockResolvedValueOnce({ workspace: concurrentlySaved, revision: 3 });

    await commitRecordEdit({ read, save }, base, draft);

    expect(save.mock.calls.map(([, revision]) => revision)).toEqual([2, 3]);
    expect(save.mock.calls[1][0].tests[0]).toMatchObject({
      suite: "Payments",
      steps: "Sign in as an editor",
      developerRemarks: "Retest on Monday",
    });
  });

  it("keeps an edit from overwriting a competing change or restoring a deleted record", async () => {
    const base = fixture();
    const draft = apply(createRecordEdit(base, "editor", "Test case", "T1"), {
      expected: "Members page",
    });
    const latest = structuredClone(base);
    latest.tests[0].expected = "Overview page";
    const save = vi.fn();

    await expect(
      commitRecordEdit(
        { read: async () => ({ workspace: latest, revision: 2 }), save },
        base,
        draft,
      ),
    ).rejects.toThrow(/test T1 \(expected\)/);
    await expect(
      commitRecordEdit(
        { read: async () => ({ workspace: { ...latest, tests: [] }, revision: 2 }), save },
        base,
        draft,
      ),
    ).rejects.toThrow(/test T1/);
    expect(save).not.toHaveBeenCalled();
  });
});
