import { describe, expect, it } from "vitest";
import { firstBloodAchievement } from "./achievements";
import { emptyWorkspace, parseWorkspace, TYPES, type Issue, type Modification } from "./model";

const quest: Issue = {
  id: "q1",
  title: "Portal",
  description: "Review sign in",
  status: "Completed",
  type: "Task",
  priority: "Medium",
  assignee: "Ana",
  xp: 100,
  labels: [],
  createdAt: "2026-11-08T00:00:00Z",
};
const modification: Modification = {
  id: "m1",
  projectId: "p1",
  projectName: "Portal",
  module: "Sign in",
  description: "Update validation",
  status: "Completed",
  priority: "Medium",
  developer: "Ana",
  notes: "",
};

describe("First blood achievement", () => {
  it.each(TYPES)("unlocks for an already completed %s without an activity entry", (type) => {
    const workspace = { ...emptyWorkspace(), issues: [{ ...quest, type }] };
    const result = firstBloodAchievement(workspace);
    expect(result.count).toBeGreaterThanOrEqual(result.goal);
    expect(workspace.activity).toEqual([]);
  });

  it("unlocks when the only completed record is a modification", () => {
    expect(
      firstBloodAchievement({ ...emptyWorkspace(), modifications: [modification] }),
    ).toMatchObject({ count: 1, goal: 1 });
  });

  it("stays locked for empty workspaces and work that has not reached Completed", () => {
    expect(firstBloodAchievement(emptyWorkspace()).count).toBe(0);
    const statuses = ["Backlog", "In progress", "In review"] as const;
    expect(
      firstBloodAchievement({
        ...emptyWorkspace(),
        issues: statuses.map((status) => ({ ...quest, status })),
        modifications: statuses.map((status) => ({ ...modification, status })),
      }).count,
    ).toBe(0);
  });

  it("reads loaded saved records, including legacy Done statuses", () => {
    const stored = JSON.parse(
      JSON.stringify({
        ...emptyWorkspace(),
        issues: [{ ...quest, status: "Done" }],
      }),
    );
    const restored = parseWorkspace(stored)!;
    expect(restored).not.toBeNull();
    expect(firstBloodAchievement(restored).count).toBe(1);
  });

  it("recalculates after reopening or deleting the last completed record", () => {
    const workspace = { ...emptyWorkspace(), issues: [quest], modifications: [modification] };
    const before = JSON.stringify(workspace);
    expect(firstBloodAchievement(workspace).count).toBe(2);
    expect(JSON.stringify(workspace)).toBe(before);
    expect(
      firstBloodAchievement({
        ...workspace,
        issues: [{ ...quest, status: "In progress" }],
        modifications: [],
      }).count,
    ).toBe(0);
  });
});
