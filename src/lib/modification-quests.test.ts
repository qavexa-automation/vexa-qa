import { describe, expect, it } from "vitest";
import { emptyWorkspace, metrics, type Modification } from "./model";
import {
  MODIFICATION_XP,
  modificationForQuest,
  modificationQuestId,
  modificationQuests,
  modificationXp,
} from "./modification-quests";

const modification = (id: string, status: Modification["status"]): Modification => ({
  id,
  projectId: "project-1",
  projectName: "Portal",
  module: "Login",
  description: "Validate login",
  priority: "High",
  status,
  developer: "Ana",
  notes: "",
  requestedAt: "2026-10-28",
});

describe("modification quests", () => {
  it("awards XP by status", () => {
    expect(MODIFICATION_XP).toEqual({
      Backlog: 0,
      "In progress": 50,
      "In review": 0,
      Completed: 100,
    });
  });

  it("shows each modification as a quest in its status column", () => {
    const [quest] = modificationQuests([
      modification("3f9a21c0-1111-4222-8333-444455556666", "In progress"),
    ]);
    expect(quest).toEqual({
      id: "MOD-3F9A21C0",
      title: "Portal",
      projectId: "project-1",
      description: "Validate login",
      status: "In progress",
      priority: "High",
      type: "Task",
      assignee: "Ana",
      xp: 50,
      labels: ["Modification", "Login"],
      createdAt: "2026-10-28",
    });
  });

  it("finds the modification behind a board ID and ignores ordinary quests", () => {
    const records = [modification("3f9a21c0-1111", "Backlog")];
    expect(modificationForQuest(records, modificationQuestId(records[0]))).toBe(records[0]);
    expect(modificationForQuest(records, "VXA-1042")).toBeUndefined();
  });

  it("adds modification XP to the workspace total", () => {
    const modifications = [
      modification("a", "Completed"),
      modification("b", "In progress"),
      modification("c", "In review"),
    ];
    expect(modificationXp(modifications)).toBe(150);
    expect(metrics({ ...emptyWorkspace(), modifications }).xp).toBe(150);
  });
});
