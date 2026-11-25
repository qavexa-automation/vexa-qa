import { describe, expect, it } from "vitest";
import { emptyWorkspace } from "@/lib/model";

import type { WorkspaceSource } from "./workspace-records";
import { questChange, workspaceQuests } from "./workspace-quests";

function fixture(owner: string, role: WorkspaceSource["role"] = "editor"): WorkspaceSource {
  return {
    owner,
    label: owner,
    role,
    workspace: {
      ...emptyWorkspace(),
      projects: [{ id: "p", name: owner, department: "QA", developer: "Alex" }],
      issues: [
        {
          id: "VXA-1",
          projectId: "p",
          title: owner,
          description: "Test the release",
          type: "Bug",
          priority: "Medium",
          status: "Backlog",
          assignee: "Alex",
          xp: 75,
          labels: [],
          createdAt: "",
        },
      ],
      modifications: [
        {
          id: "modification-1",
          projectId: "p",
          projectName: owner,
          module: "Checkout",
          description: "Fix validation",
          developer: "Alex",
          priority: "High",
          status: "In progress",
          notes: "",
        },
      ],
    },
  };
}

describe("Quest Board across workspaces", () => {
  it("includes tracker modifications and scopes identical IDs to their workspace", () => {
    const rows = workspaceQuests([
      fixture("QA"),
      fixture("Q2"),
      fixture("Restricted", "developer"),
    ]);
    expect(rows.map(({ issue, record }) => [issue.workspace, record.type, issue.status])).toEqual([
      ["QA", "Quest", "Backlog"],
      ["QA", "Modification", "In progress"],
      ["Q2", "Quest", "Backlog"],
      ["Q2", "Modification", "In progress"],
    ]);
    expect(new Set(rows.map(({ issue }) => issue.boardKey)).size).toBe(4);
    expect(rows[1].issue.labels).toContain("Modification");
  });

  it("moves a tracker card by updating the underlying modification", () => {
    const qa = fixture("QA");
    const q2 = fixture("Q2");
    const modification = workspaceQuests([qa, q2])[3].record;
    const draft = questChange(q2, modification, { status: "Completed" });

    expect(draft.modifications?.[0]).toMatchObject({ id: "modification-1", status: "Completed" });
    expect(draft.issues[0].status).toBe("Backlog");
    expect(qa.workspace.modifications?.[0].status).toBe("In progress");
    expect(() => questChange(qa, modification, { status: "Completed" })).toThrow(/access/);
  });

  it("moves a regular quest and records completion XP", () => {
    const qa = fixture("QA");
    const quest = workspaceQuests([qa])[0].record;
    const draft = questChange(qa, quest, { status: "Completed" });
    expect(draft.issues[0].status).toBe("Completed");
    expect(draft.activity[0].text).toContain("75 XP earned");
    expect(draft.modifications?.[0].status).toBe("In progress");
  });
});
