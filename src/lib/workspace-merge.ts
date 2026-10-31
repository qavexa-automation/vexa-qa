import { updateProjects, type Workspace } from "./model";

// PostgreSQL JSONB can reorder object keys, which must not count as a data change.
function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => equal(v, b[i]));
  if (
    !a ||
    !b ||
    typeof a !== "object" ||
    typeof b !== "object" ||
    Array.isArray(a) ||
    Array.isArray(b)
  )
    return false;
  const left = a as Record<string, unknown>,
    right = b as Record<string, unknown>;
  const keys = Object.keys(left).filter((key) => left[key] !== undefined);
  return (
    keys.length === Object.keys(right).filter((key) => right[key] !== undefined).length &&
    keys.every((key) => Object.hasOwn(right, key) && equal(left[key], right[key]))
  );
}

// Three-way merge: retain independent edits, but never guess which competing edit wins.
export function mergeWorkspaces(base: Workspace, local: Workspace, remote: Workspace): Workspace {
  function value<T>(before: T, ours: T, theirs: T, path: string): T {
    if (equal(ours, before)) return theirs;
    if (equal(theirs, before) || equal(ours, theirs)) return ours;
    throw new Error(
      `Both users changed ${path}. Export your unsaved work, then reload to review the latest version.`,
    );
  }

  function records<T extends { id: string }>(
    before: T[],
    ours: T[],
    theirs: T[],
    path: string,
  ): T[] {
    const original = new Map(before.map((record) => [record.id, record]));
    const localRecords = new Map(ours.map((record) => [record.id, record]));
    const remoteRecords = new Map(theirs.map((record) => [record.id, record]));
    const result: T[] = [];
    for (const id of new Set([...theirs.map((r) => r.id), ...ours.map((r) => r.id)])) {
      const b = original.get(id),
        l = localRecords.get(id),
        r = remoteRecords.get(id);
      let merged: T | undefined;
      if (b && l && r) {
        merged = { ...r };
        for (const key of new Set([...Object.keys(b), ...Object.keys(l), ...Object.keys(r)]) as Set<
          keyof T
        >) {
          merged[key] = value(b[key], l[key], r[key], `${path} ${id} (${String(key)})`);
        }
      } else merged = value(b, l, r, `${path} ${id}`);
      if (merged) result.push(merged);
    }
    return result;
  }

  const merged: Workspace = {
    projects: records(base.projects ?? [], local.projects ?? [], remote.projects ?? [], "project"),
    issues: records(base.issues, local.issues, remote.issues, "quest"),
    tests: records(base.tests, local.tests, remote.tests, "test"),
    modifications: records(
      base.modifications ?? [],
      local.modifications ?? [],
      remote.modifications ?? [],
      "modification",
    ),
    deployments: records(
      base.deployments ?? [],
      local.deployments ?? [],
      remote.deployments ?? [],
      "deployment",
    ),
    activity: records(base.activity, local.activity, remote.activity, "activity")
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 40),
    sprint: value(base.sprint, local.sprint, remote.sprint, "sprint name"),
    sprintGoal: value(base.sprintGoal, local.sprintGoal, remote.sprintGoal, "sprint goal"),
  };
  return updateProjects(merged, merged.projects ?? []);
}

export const sameWorkspace = (a: Workspace, b: Workspace) => equal(a, b);
