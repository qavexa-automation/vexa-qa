import { describe, expect, it, vi } from "vitest";

import type { Attachment } from "@/features/attachments";
import { emptyWorkspace } from "@/lib/model";

import { commitRecordDeletion } from "./delete-record";
import type { WorkspaceSource } from "./workspace-records";

const attachment: Attachment = {
  id: "file",
  name: "result.txt",
  storedName: "result.txt",
  contentType: "text/plain",
  size: 24,
  storedSize: 24,
  encoding: "none",
  path: "team/TC-1/file",
  uploadedAt: "2026-11-25T00:00:00Z",
};
const record = { owner: "team", type: "Test case", id: "TC-1" } as const;

function fixture(): WorkspaceSource {
  return {
    owner: "team",
    label: "Team workspace",
    role: "editor",
    workspace: {
      ...emptyWorkspace(),
      tests: [
        {
          id: "TC-1",
          title: "Portal",
          suite: "Login",
          steps: "Sign in",
          expected: "Dashboard opens",
          status: "Not Tested",
          lastRun: null,
          attachments: [attachment],
        },
      ],
    },
  };
}

describe("Deleting records across workspaces", () => {
  it("saves the deletion in the source and returns only that record's unreferenced attachments", async () => {
    const source = fixture();
    const latest = { ...source.workspace, sprintGoal: "QA team update" };
    const backend = {
      read: vi.fn().mockResolvedValue({ workspace: latest, revision: 2 }),
      save: vi.fn().mockResolvedValue(3),
    };
    await expect(commitRecordDeletion(backend, source, record)).resolves.toEqual([attachment]);
    expect(backend.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sprintGoal: "QA team update",
        tests: [],
        activity: [expect.objectContaining({ text: "TC-1 deleted" })],
      }),
      2,
    );
    expect(source.workspace.tests).toHaveLength(1);
  });

  it("keeps the record and attachments when another teammate changed it during confirmation", async () => {
    const source = fixture();
    const latest = structuredClone(source.workspace);
    latest.tests[0].expected = "Account opens";
    const backend = {
      read: vi.fn().mockResolvedValue({ workspace: latest, revision: 2 }),
      save: vi.fn(),
    };
    await expect(commitRecordDeletion(backend, source, record)).rejects.toThrow(/record changed/);
    expect(backend.save).not.toHaveBeenCalled();
    expect(latest.tests[0].attachments).toEqual([attachment]);
  });

  it("treats concurrent deletion as already completed without recording another deletion", async () => {
    const source = fixture();
    const backend = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ workspace: source.workspace, revision: 1 })
        .mockResolvedValueOnce({ workspace: { ...source.workspace, tests: [] }, revision: 2 }),
      save: vi.fn().mockRejectedValueOnce({ code: "40001" }),
    };
    await expect(commitRecordDeletion(backend, source, record)).resolves.toEqual([]);
    expect(backend.save).toHaveBeenCalledTimes(1);
  });

  it("rejects Developer deletions and requests for another workspace before reading", async () => {
    const source = fixture();
    const backend = { read: vi.fn(), save: vi.fn() };
    await expect(
      commitRecordDeletion(backend, { ...source, role: "developer" }, record),
    ).rejects.toThrow(/access/);
    await expect(
      commitRecordDeletion(backend, source, { ...record, owner: "other" }),
    ).rejects.toThrow(/access/);
    expect(backend.read).not.toHaveBeenCalled();
  });
});
