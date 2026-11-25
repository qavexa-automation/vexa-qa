import { describe, expect, it } from "vitest";
import { emptyWorkspace, parseWorkspace, type Workspace } from "@/lib/model";
import { mergeWorkspaces } from "@/lib/workspace-merge";
import { canOpenWorkspaceView, canUpdateWorkspace } from "./workspace-access";

function fixture(): Workspace {
  return { ...emptyWorkspace(), tests: [{ id: "TC-1", title: "Portal", suite: "Login", steps: "Sign in", expected: "Dashboard", status: "Not Tested", lastRun: null }] };
}

describe("Developer workspace access", () => {
  it("opens the tracker, Test Lab, account settings and the combined workspace view", () => {
    for (const view of ["All workspaces", "Modification Tracker", "Test lab", "Settings"]) expect(canOpenWorkspaceView("developer", view)).toBe(true);
    for (const view of ["Overview", "Quest board", "Project Maintenance", "Deployment Tracker"]) {
      expect(canOpenWorkspaceView("developer", view)).toBe(false);
      expect(canOpenWorkspaceView("editor", view)).toBe(true);
    }
  });

  it("allows adding, changing and clearing remarks without other changes", () => {
    const before = fixture();
    for (const developerRemarks of ["Fixed validation\nReady to retest", ""]) {
      const after = structuredClone(before);
      after.tests[0].developerRemarks = developerRemarks;
      expect(canUpdateWorkspace("developer", before, after)).toBe(true);
    }
  });

  it("rejects changes to protected fields, records, ordering and workspace settings", () => {
    const before = fixture();
    const changes: ((w: Workspace) => void)[] = [
      (w) => { w.tests[0].status = "Not Applicable"; },
      (w) => { w.tests[0].steps = "Altered"; },
      (w) => { w.tests = []; },
      (w) => { w.tests.push({ ...w.tests[0], id: "TC-2" }); },
      (w) => { w.sprint = "Changed"; },
      (w) => { w.modifications = [{ id: "MOD-1", projectId: "", projectName: "Portal", module: "Login", description: "Altered", priority: "Medium", status: "Backlog", developer: "Ana", notes: "" }]; },
    ];
    for (const change of changes) {
      const after = structuredClone(before);
      after.tests[0].developerRemarks = "Remark";
      change(after);
      expect(canUpdateWorkspace("developer", before, after)).toBe(false);
      expect(canUpdateWorkspace("editor", before, after)).toBe(true);
    }
    const ordered = fixture();
    ordered.tests.push({ ...ordered.tests[0], id: "TC-2" });
    expect(canUpdateWorkspace("developer", ordered, { ...ordered, tests: [...ordered.tests].reverse() })).toBe(false);
  });

  it("validates stored remarks while accepting older workspaces", () => {
    expect(parseWorkspace(fixture())).not.toBeNull();
    const workspace = fixture();
    workspace.tests[0].developerRemarks = "Ready";
    expect(parseWorkspace(workspace)?.tests[0].developerRemarks).toBe("Ready");
    const invalid = { ...workspace, tests: [{ ...workspace.tests[0], developerRemarks: 123 }] };
    expect(parseWorkspace(invalid)).toBeNull();
    expect(canUpdateWorkspace("developer", fixture(), invalid as unknown as Workspace)).toBe(false);
  });

  it("merges a developer remark with an independent QA result and detects conflicting remarks", () => {
    const base = fixture();
    const local = structuredClone(base);
    local.tests[0].developerRemarks = "Fixed";
    const remote = structuredClone(base);
    remote.tests[0].status = "Not Applicable";
    expect(mergeWorkspaces(base, local, remote).tests[0]).toMatchObject({ status: "Not Applicable", developerRemarks: "Fixed" });
    remote.tests[0].developerRemarks = "Different remark";
    expect(() => mergeWorkspaces(base, local, remote)).toThrow(/developerRemarks/);
  });
});
