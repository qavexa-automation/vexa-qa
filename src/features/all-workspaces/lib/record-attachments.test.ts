import { describe, expect, it, vi } from "vitest";

import type { Attachment } from "@/features/attachments";
import { emptyWorkspace, type Workspace } from "@/lib/model";

import { canAttachToRecord, commitRecordAttachments } from "./record-attachments";
import type { WorkspaceSource } from "./workspace-records";

const file = (id: string): Attachment => ({
  id,
  name: `${id}.png`,
  storedName: `${id}.webp`,
  contentType: "image/webp",
  size: 100,
  storedSize: 40,
  encoding: "webp",
  path: `team/TC-1/${id}`,
  uploadedAt: "2026-11-26T00:00:00Z",
});
const record = { owner: "team", type: "Test case", id: "TC-1" } as const;

function workspace(attachments: Attachment[] = []): Workspace {
  return {
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
        attachments,
      },
    ],
  };
}

describe("Attaching files in combined lists", () => {
  it("lets Owners and Editors attach to tests and modifications only", () => {
    const source = (role: WorkspaceSource["role"]): WorkspaceSource => ({
      owner: "team",
      label: "QA-ANA",
      role,
      workspace: workspace(),
    });
    expect(canAttachToRecord(source("editor"), record)).toBe(true);
    expect(canAttachToRecord(source("owner"), { ...record, type: "Modification" })).toBe(true);
    expect(canAttachToRecord(source("developer"), record)).toBe(false);
    expect(canAttachToRecord(source("editor"), { ...record, type: "Quest" })).toBe(false);
    expect(canAttachToRecord(source("editor"), { ...record, owner: "other" })).toBe(false);
    expect(canAttachToRecord(undefined, record)).toBe(false);
  });

  it("adds to the latest saved list and retries after a revision conflict", async () => {
    const backend = {
      read: vi
        .fn()
        .mockResolvedValueOnce({ workspace: workspace([file("a")]), revision: 2 })
        .mockResolvedValueOnce({ workspace: workspace([file("a"), file("b")]), revision: 3 }),
      save: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error("Workspace changed"), { code: "40001" }))
        .mockResolvedValueOnce(4),
    };
    await commitRecordAttachments(backend, record, (current) => [...current, file("c")]);
    expect(backend.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        tests: [expect.objectContaining({ attachments: [file("a"), file("b"), file("c")] })],
      }),
      3,
    );
  });

  it("refuses when the record was deleted meanwhile", async () => {
    const backend = {
      read: vi.fn().mockResolvedValue({ workspace: emptyWorkspace(), revision: 2 }),
      save: vi.fn(),
    };
    await expect(commitRecordAttachments(backend, record, (current) => current)).rejects.toThrow(
      "no longer available",
    );
    expect(backend.save).not.toHaveBeenCalled();
  });
});
