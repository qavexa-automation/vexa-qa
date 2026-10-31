import { describe, expect, it, vi } from "vitest";
import { CloudWorkspace, type CloudSnapshot } from "./cloud-workspace";
import { emptyWorkspace, type Workspace } from "./model";
import { mergeWorkspaces, sameWorkspace } from "./workspace-merge";

function fixture(): Workspace {
  return {
    ...emptyWorkspace(),
    projects: [
      { id: "a", name: "Alpha", department: "IT", developer: "Ana" },
      { id: "b", name: "Beta", department: "IT", developer: "Ben" },
    ],
  };
}
const copy = (workspace: Workspace) => structuredClone(workspace);
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("collaborative workspace merge", () => {
  it("merges independent additions, edits, and deletions across records", () => {
    const base = fixture(),
      local = copy(base),
      remote = copy(base);
    local.projects![0].department = "QA";
    remote.projects![1].name = "Beta renamed";
    const result = mergeWorkspaces(base, local, remote);
    expect(result.projects).toEqual([{ ...local.projects![0] }, { ...remote.projects![1] }]);
    local.projects!.splice(1, 1);
    remote.projects![1] = base.projects![1];
    remote.projects!.push({ ...base.projects![0], id: "c", name: "Gamma" });
    expect(mergeWorkspaces(base, local, remote).projects?.map((p) => p.id)).toEqual(["a", "c"]);
  });
  it("merges different fields of one record and detects competing field edits", () => {
    const base = fixture(),
      local = copy(base),
      remote = copy(base);
    local.projects![0].name = "Local";
    remote.projects![0].department = "Remote department";
    expect(mergeWorkspaces(base, local, remote).projects![0]).toMatchObject({
      name: "Local",
      department: "Remote department",
    });
    remote.projects![0].name = "Remote";
    expect(() => mergeWorkspaces(base, local, remote)).toThrow(
      "Both users changed project a (name)",
    );
    expect(local.projects![0].name).toBe("Local");
  });
  it("detects deletion versus modification instead of resurrecting deleted records", () => {
    const base = fixture(),
      local = copy(base),
      remote = copy(base);
    local.projects = [];
    remote.projects![0].name = "Changed";
    expect(() => mergeWorkspaces(base, local, remote)).toThrow("Both users changed project a");
  });
  it("retains simultaneous test outcomes and modifications", () => {
    const base = fixture();
    base.tests = [
      {
        id: "t",
        title: "Alpha",
        projectId: "a",
        suite: "Login",
        steps: "Sign in",
        expected: "Success",
        status: "Not Tested",
        lastRun: null,
      },
    ];
    const local = copy(base),
      remote = copy(base);
    local.tests[0] = { ...local.tests[0], status: "Passed", lastRun: "2026-10-31T01:00:00Z" };
    remote.modifications = [
      {
        id: "m",
        projectId: "a",
        projectName: "Alpha",
        module: "Login",
        description: "Update",
        priority: "High",
        status: "In progress",
        developer: "Ana",
        notes: "",
      },
    ];
    remote.projects![0].name = "Renamed Alpha";
    const result = mergeWorkspaces(base, local, remote);
    expect(result.tests[0]).toMatchObject({ status: "Passed", title: "Renamed Alpha" });
    expect(result.modifications![0].projectName).toBe("Renamed Alpha");
  });
  it("combines activity chronologically and limits it to 40 records", () => {
    const base = emptyWorkspace(),
      local = copy(base),
      remote = copy(base);
    local.activity = Array.from({ length: 30 }, (_, i) => ({
      id: `l-${i}`,
      text: "Local",
      date: `2026-10-31T01:00:${String(i).padStart(2, "0")}Z`,
      kind: "issue",
    }));
    remote.activity = local.activity.map((a, i) => ({
      ...a,
      id: `r-${i}`,
      date: a.date.replace("01:00:", "02:00:"),
    }));
    const result = mergeWorkspaces(base, local, remote);
    expect(result.activity).toHaveLength(40);
    expect(new Set(result.activity.map((a) => a.id)).size).toBe(40);
    expect(result.activity[0].id).toBe("r-29");
  });
  it("ignores JSONB property order and accepts identical competing edits", () => {
    const base = fixture(),
      local = copy(base),
      remote = copy(base);
    remote.projects = remote.projects!.map(({ id, name, department, developer }) => ({
      developer,
      department,
      name,
      id,
    }));
    expect(sameWorkspace(base, remote)).toBe(true);
    local.sprint = remote.sprint = "Sprint 2";
    expect(mergeWorkspaces(base, local, remote).sprint).toBe("Sprint 2");
    remote.sprint = "Sprint 3";
    expect(() => mergeWorkspaces(base, local, remote)).toThrow("sprint name");
  });
});

describe("cloud sync across sessions", () => {
  function backend() {
    let stored: CloudSnapshot = { workspace: fixture(), revision: 1 };
    return {
      read: vi.fn(async () => structuredClone(stored)),
      save: vi.fn(async (workspace: Workspace, revision: number) => {
        if (revision !== stored.revision)
          throw Object.assign(new Error("Conflict"), { code: "40001" });
        stored = { workspace: copy(workspace), revision: revision + 1 };
        return stored.revision;
      }),
    };
  }
  it("shows another user's saved changes without a page reload", async () => {
    const db = backend(),
      changed = vi.fn(),
      failed = vi.fn();
    const a = new CloudWorkspace(await db.read(), db, vi.fn(), failed);
    const b = new CloudWorkspace(await db.read(), db, changed, failed);
    a.edit({ ...a.local, sprint: "Team sprint" });
    await a.save();
    await b.refresh();
    expect(b.local.sprint).toBe("Team sprint");
    expect(b.pending).toBe(false);
    expect(changed).toHaveBeenLastCalledWith(b.local, false);
    expect(failed).not.toHaveBeenCalled();
  });
  it("retries conflicting saves and retains both users' independent changes", async () => {
    const db = backend(),
      failed = vi.fn();
    const a = new CloudWorkspace(await db.read(), db, vi.fn(), failed);
    const b = new CloudWorkspace(await db.read(), db, vi.fn(), failed);
    a.edit({ ...a.local, sprint: "A sprint" });
    b.edit({ ...b.local, sprintGoal: "B goal" });
    await Promise.all([a.save(), b.save()]);
    expect((await db.read()).workspace).toMatchObject({ sprint: "A sprint", sprintGoal: "B goal" });
    expect(db.save).toHaveBeenCalledTimes(3);
    expect(failed).not.toHaveBeenCalled();
  });
  it("blocks conflicting edits and retains unsaved work for export", async () => {
    const db = backend(),
      failed = vi.fn();
    const a = new CloudWorkspace(await db.read(), db, vi.fn(), vi.fn());
    const b = new CloudWorkspace(await db.read(), db, vi.fn(), failed);
    a.edit({ ...a.local, sprint: "A sprint" });
    b.edit({ ...b.local, sprint: "B sprint" });
    await a.save();
    await b.save();
    await b.save();
    expect(b.local.sprint).toBe("B sprint");
    expect(b.canSwitch).toBe(false);
    expect((await db.read()).workspace.sprint).toBe("A sprint");
    expect(failed).toHaveBeenCalledOnce();
  });
  it("keeps edits made while an earlier save is in flight", async () => {
    const db = backend(),
      gate = deferred<number>(),
      started = deferred<void>();
    const delayed = {
      ...db,
      save: vi.fn(async () => {
        started.resolve();
        return gate.promise;
      }),
    };
    const session = new CloudWorkspace(await db.read(), delayed, vi.fn(), vi.fn());
    session.edit({ ...session.local, sprint: "First edit" });
    const saving = session.save();
    await started.promise;
    session.edit({ ...session.local, sprintGoal: "Edited during save" });
    gate.resolve(2);
    await saving;
    expect(session.pending).toBe(true);
    expect(session.local.sprintGoal).toBe("Edited during save");
  });
  it("serializes reads behind writes and ignores callbacks after switching accounts", async () => {
    const db = backend(),
      gate = deferred<number>(),
      started = deferred<void>(),
      changed = vi.fn();
    const session = new CloudWorkspace(
      await db.read(),
      {
        ...db,
        save: async () => {
          started.resolve();
          return gate.promise;
        },
      },
      changed,
      vi.fn(),
    );
    session.edit({ ...session.local, sprint: "Pending" });
    const saving = session.save();
    await started.promise;
    const refresh = session.refresh();
    expect(db.read).toHaveBeenCalledTimes(1);
    session.dispose();
    changed.mockClear();
    gate.resolve(2);
    await Promise.all([saving, refresh]);
    expect(changed).not.toHaveBeenCalled();
    expect(db.read).toHaveBeenCalledTimes(1);
  });
  it("surfaces access removal and stops additional saves", async () => {
    const db = backend(),
      failed = vi.fn();
    const session = new CloudWorkspace(
      await db.read(),
      {
        ...db,
        read: async () => {
          throw new Error("Access removed");
        },
      },
      vi.fn(),
      failed,
    );
    await session.refresh();
    session.edit({ ...session.local, sprint: "Unauthorized change" });
    await session.save();
    expect(failed).toHaveBeenCalledWith("Access removed");
    expect(db.save).not.toHaveBeenCalled();
    expect(session.canSwitch).toBe(false);
  });
  it("recovers missed changes after a temporary background connection failure", async () => {
    const db = backend(),
      failed = vi.fn();
    const read = vi.fn(db.read);
    const session = new CloudWorkspace(await db.read(), { ...db, read }, vi.fn(), failed);
    read.mockRejectedValueOnce(
      Object.assign(new Error("Network unavailable"), { retryable: true }),
    );
    await session.refresh();
    await db.save({ ...session.local, sprint: "Changed while offline" }, 1);
    await session.refresh();
    expect(session.local.sprint).toBe("Changed while offline");
    expect(failed).not.toHaveBeenCalled();
  });
  it("can initialize an empty workspace before generating an invitation", async () => {
    const save = vi.fn(async () => 1);
    const session = new CloudWorkspace(
      { workspace: emptyWorkspace(), revision: 0 },
      {
        read: async () => ({ workspace: emptyWorkspace(), revision: 0 }),
        save,
      },
      vi.fn(),
      vi.fn(),
    );
    await session.save(true);
    await session.save(true);
    expect(save).toHaveBeenCalledOnce();
    expect(session.canSwitch).toBe(true);
  });
});
