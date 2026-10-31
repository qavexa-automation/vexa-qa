import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { emptyWorkspace, type Workspace } from "./model";
import { parseCloudSnapshot, relationalBackend, workspaceForSave } from "./relational-workspace";

const A = "10000000-0000-4000-8000-000000000001";
const B = "10000000-0000-4000-8000-000000000002";
const C = "10000000-0000-4000-8000-000000000003";
const migration = readFileSync(
  new URL("../../supabase/migrations/20261031143252_relational_workspace.sql", import.meta.url),
  "utf8",
);
const hardeningMigration = readFileSync(
  new URL("../../supabase/migrations/20261031143409_harden_rls_auto_enable.sql", import.meta.url),
  "utf8",
);

function fixture(): Workspace {
  return {
    ...emptyWorkspace(),
    projects: [{ id: "project-1", name: "Portal", department: "IT / QA", developer: "Ana" }],
    issues: [
      {
        id: "VXA-001",
        title: "Portal",
        projectId: "project-1",
        description: "Fix login",
        status: "Backlog",
        priority: "High",
        type: "Bug",
        assignee: "Ana",
        xp: 100,
        labels: ["login", "regression"],
        createdAt: "2026-10-31T01:02:03.004Z",
      },
    ],
    tests: [
      {
        id: "TC-001",
        title: "Portal",
        projectId: "project-1",
        suite: "Login",
        steps: "Open portal\nSign in",
        expected: "Dashboard is visible",
        status: "Not Tested",
        lastRun: null,
      },
    ],
    modifications: [
      {
        id: "change-1",
        projectId: "project-1",
        projectName: "Portal",
        module: "Login",
        description: "Update validation",
        priority: "Medium",
        status: "In progress",
        developer: "Ana",
        notes: "",
      },
    ],
    deployments: [
      {
        id: "deploy-1",
        projectId: "project-1",
        projectName: "Portal",
        environment: "Staging",
        version: "1.0.0",
        deploymentDate: "2026-10-31",
        status: "Planned",
        notes: "Release rehearsal",
      },
    ],
    activity: [
      { id: "event-1", text: "Created quest", date: "2026-10-31T01:02:03.004Z", kind: "issue" },
    ],
  };
}

describe("relational workspace database", () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$
        select (nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub')::uuid;
      $$;
      create function auth.jwt() returns jsonb language sql stable as $$
        select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
      $$;
      grant usage on schema public, auth to anon, authenticated;
      insert into auth.users values ('${A}'), ('${B}'), ('${C}');
    `);
    await db.exec(migration);
    await db.exec(hardeningMigration);
  }, 30000);
  afterAll(async () => {
    await db?.close();
  });
  beforeEach(async () => {
    await db.exec("reset role; truncate public.qa_workspaces cascade;");
  });

  async function as<T>(id: string | null, action: () => Promise<T>, role = "authenticated") {
    await db.exec(`set role ${role}`);
    await db.query("select set_config('request.jwt.claims', $1, false)", [
      JSON.stringify(id ? { sub: id, email: `${id}@example.test` } : {}),
    ]);
    try {
      return await action();
    } finally {
      await db.exec("reset role");
    }
  }
  async function save(id: string, workspace = fixture(), revision = 0, owner = id) {
    return as(id, async () => {
      const result = await db.query<{ revision: number }>(
        "select public.save_qa_workspace($1::jsonb, $2::bigint, $3::uuid) as revision",
        [JSON.stringify(workspaceForSave(workspace)), revision, owner],
      );
      return Number(result.rows[0].revision);
    });
  }
  async function read(id: string, owner = id) {
    return as(id, async () => {
      const result = await db.query<{ snapshot: unknown }>(
        "select public.read_qa_workspace($1::uuid) as snapshot",
        [owner],
      );
      return result.rows[0].snapshot;
    });
  }
  async function invite() {
    return as(
      A,
      async () =>
        (await db.query<{ code: string }>("select public.create_qa_workspace_invite() as code"))
          .rows[0].code,
    );
  }
  async function join(id: string, code: string) {
    return as(id, () => db.query("select public.join_qa_workspace($1::uuid)", [code]));
  }

  it("has no JSON columns, enables RLS everywhere, and keeps definer code private", async () => {
    const jsonColumns =
      await db.query(`select table_name, column_name from information_schema.columns
      where table_schema = 'public' and data_type in ('json', 'jsonb')`);
    expect(jsonColumns.rows).toEqual([]);
    const tables = await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r'",
    );
    expect(tables.rows).toHaveLength(10);
    expect(tables.rows.every((t) => t.relrowsecurity)).toBe(true);
    expect(
      (
        await db.query(`select proname from pg_proc
      where pronamespace = 'public'::regnamespace and prosecdef`)
      ).rows,
    ).toEqual([]);
    const missingIndexes = await db.query(`select c.conname from pg_constraint c
      where c.contype = 'f' and c.connamespace = 'public'::regnamespace and not exists (
        select 1 from pg_index i where i.indrelid = c.conrelid and i.indisvalid
        and (i.indkey::smallint[])[0:cardinality(c.conkey)-1] @> c.conkey
      )`);
    expect(missingIndexes.rows).toEqual([]);
  });

  it("revokes client execution of the optional platform RLS event-trigger helper", async () => {
    await db.exec(`create function public.rls_auto_enable() returns event_trigger
      language plpgsql security definer set search_path = '' as $$ begin return; end; $$;
      grant execute on function public.rls_auto_enable() to public, anon, authenticated;`);
    try {
      await db.exec(hardeningMigration);
      expect(
        (
          await db.query(`select
        has_function_privilege('anon', 'public.rls_auto_enable()', 'execute') as anon,
        has_function_privilege('authenticated', 'public.rls_auto_enable()', 'execute') as authenticated
      `)
        ).rows,
      ).toEqual([{ anon: false, authenticated: false }]);
    } finally {
      await db.exec("drop function public.rls_auto_enable()");
    }
  });

  it("round-trips all entities, labels, null test timestamps, dates, and row order", async () => {
    const workspace = fixture();
    workspace.projects!.unshift({
      id: "project-2",
      name: "Second",
      department: "Ops",
      developer: "Ben",
    });
    expect(await read(A)).toBeNull();
    expect(await save(A, workspace)).toBe(1);
    expect(parseCloudSnapshot(await read(A), true)).toEqual({ workspace, revision: 1 });
    expect(
      (await db.query("select label from public.qa_issue_labels order by display_order")).rows,
    ).toEqual([{ label: "login" }, { label: "regression" }]);
    workspace.tests[0] = {
      ...workspace.tests[0],
      status: "Passed",
      lastRun: "2026-10-31T01:05:00.000Z",
    };
    expect(await save(A, workspace, 1)).toBe(2);
    expect(parseCloudSnapshot(await read(A), true)).toEqual({ workspace, revision: 2 });
  });

  it("updates and deletes rows, retains creation timestamps, and preserves history after project deletion", async () => {
    const workspace = fixture();
    await save(A, workspace);
    const before = (await db.query("select created_at, updated_at from public.qa_projects")).rows;
    await save(A, workspace, 1);
    expect((await db.query("select created_at, updated_at from public.qa_projects")).rows).toEqual(
      before,
    );
    workspace.projects = [];
    workspace.issues[0].labels = ["regression"];
    await save(A, workspace, 2);
    const saved = parseCloudSnapshot(await read(A), true).workspace;
    expect(saved.projects).toEqual([]);
    expect(saved.issues[0]).toMatchObject({ title: "Portal", labels: ["regression"] });
    expect(saved.issues[0].projectId).toBeUndefined();
    expect(saved.tests[0].projectId).toBeUndefined();
    expect(saved.deployments![0]).toMatchObject({ projectId: "", projectName: "Portal" });
    expect(saved.modifications![0]).toMatchObject({ projectId: "", projectName: "Portal" });
    await save(A, emptyWorkspace(), 3);
    expect((await db.query("select * from public.qa_issue_labels")).rows).toEqual([]);
    expect(parseCloudSnapshot(await read(A), true).workspace).toEqual(emptyWorkspace());
  });

  it("rejects stale revisions and atomically rolls back a failed late-table write", async () => {
    await save(A);
    await expect(save(A, fixture(), 0)).rejects.toMatchObject({ code: "40001" });
    await expect(save(A, fixture(), 5)).rejects.toMatchObject({ code: "40001" });
    const broken = fixture();
    broken.projects![0].name = "Must roll back";
    broken.deployments![0].status = "Invalid" as never;
    await expect(save(A, broken, 1)).rejects.toMatchObject({ code: "23514" });
    expect(parseCloudSnapshot(await read(A), true)).toEqual({ workspace: fixture(), revision: 1 });
    await expect(save(B, broken)).rejects.toMatchObject({ code: "23514" });
    expect(await read(B)).toBeNull();
  });

  it("rejects cross-workspace foreign keys and invalid test execution states", async () => {
    const other = fixture();
    other.projects![0].id = "private-project";
    other.issues = [];
    other.tests = [];
    other.modifications = [];
    other.deployments = [];
    await save(B, other);
    await save(A);
    const badLink = workspaceForSave(fixture());
    badLink.issues[0].projectId = "private-project";
    await expect(
      as(A, () =>
        db.query("select public.save_qa_workspace($1::jsonb, 1, $2::uuid)", [
          JSON.stringify(badLink),
          A,
        ]),
      ),
    ).rejects.toMatchObject({ code: "23503" });
    const invalidTest = fixture();
    invalidTest.tests[0].status = "Passed";
    await expect(save(A, invalidTest, 1)).rejects.toMatchObject({ code: "23514" });
    expect(parseCloudSnapshot(await read(A), true).revision).toBe(1);
  });

  it("denies anonymous access, unrelated accounts, and direct writes even by the owner", async () => {
    await save(A);
    expect(await read(B, A)).toBeNull();
    await expect(save(B, fixture(), 1, A)).rejects.toMatchObject({ code: "42501" });
    await expect(
      as(null, () => db.query("select * from public.qa_projects"), "anon"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      as(null, () => db.query("select public.read_qa_workspace($1::uuid)", [A]), "anon"),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      as(A, () => db.query("update public.qa_projects set name = 'Bypass'")),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      as(B, () =>
        db.query(
          "insert into public.qa_workspace_members(workspace_owner, member_id, member_email) values ($1, $2, 'fake')",
          [A, B],
        ),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      as(null, () =>
        db.query("select public.save_qa_workspace($1::jsonb, 1, $2::uuid)", [
          JSON.stringify(workspaceForSave(fixture())),
          A,
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  it("rejects incomplete snapshots and malformed labels without deleting saved records", async () => {
    await save(A);
    const payload = workspaceForSave(fixture());
    const { projects: _projects, ...incomplete } = payload;
    for (const invalid of [
      incomplete,
      { ...payload, issues: [{ ...payload.issues[0], labels: [123] }] },
      { ...payload, issues: [{ ...payload.issues[0], labels: null }] },
    ]) {
      await expect(
        as(A, () =>
          db.query("select public.save_qa_workspace($1::jsonb, 1, $2::uuid)", [
            JSON.stringify(invalid),
            A,
          ]),
        ),
      ).rejects.toMatchObject({ code: "22023" });
    }
    expect(parseCloudSnapshot(await read(A), true)).toEqual({ workspace: fixture(), revision: 1 });
  });

  it("allows invited members to edit and removes access immediately after removal", async () => {
    await save(A);
    await join(B, await invite());
    expect(parseCloudSnapshot(await read(B, A), false).workspace).toEqual(fixture());
    expect(await read(C, A)).toBeNull();
    const changed = fixture();
    changed.projects![0].department = "Team QA";
    expect(await save(B, changed, 1, A)).toBe(2);
    await expect(
      as(B, () => db.query("select public.create_qa_workspace_invite()")),
    ).rejects.toThrow("Save your workspace");
    expect((await as(B, () => db.query("select * from public.qa_workspace_invites"))).rows).toEqual(
      [],
    );
    await as(A, () =>
      db.query("delete from public.qa_workspace_members where member_id = $1::uuid", [B]),
    );
    expect(await read(B, A)).toBeNull();
    await expect(save(B, changed, 2, A)).rejects.toMatchObject({ code: "42501" });
    await save(B, emptyWorkspace());
    expect(parseCloudSnapshot(await read(B), true).workspace).toEqual(emptyWorkspace());
  });

  it("rotates, expires, and disables invite codes without removing existing members", async () => {
    await save(A);
    const first = await invite();
    await join(B, first);
    const second = await invite();
    expect(second).not.toBe(first);
    await expect(join(C, first)).rejects.toThrow("invalid or expired");
    await db.exec(
      "update public.qa_workspace_invites set created_at = now() - interval '8 days', expires_at = now() - interval '1 day'",
    );
    await expect(join(C, second)).rejects.toThrow("invalid or expired");
    const third = await invite();
    await as(A, () => db.query("delete from public.qa_workspace_invites"));
    await expect(join(C, third)).rejects.toThrow("invalid or expired");
    expect(parseCloudSnapshot(await read(B, A), false).revision).toBe(1);
  });

  it("cascades account deletion through owned records and memberships", async () => {
    await save(A);
    await join(B, await invite());
    await db.query("delete from auth.users where id = $1", [A]);
    expect((await db.query("select * from public.qa_workspaces")).rows).toEqual([]);
    expect((await db.query("select * from public.qa_workspace_members")).rows).toEqual([]);
    expect((await db.query("select * from public.qa_issues")).rows).toEqual([]);
    expect((await db.query("select * from public.qa_issue_labels")).rows).toEqual([]);
    await db.query("insert into auth.users values ($1)", [A]);
  });
});

describe("relational transport", () => {
  function backendWithResponse(data: unknown, status = 200) {
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    const client = createClient("https://vexa.example", "sb_publishable_test", {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: async (url, init) => {
          requests.push({ url: String(url), body: JSON.parse(String(init?.body)) });
          return new Response(JSON.stringify(data), {
            status,
            headers: { "Content-Type": "application/json" },
          });
        },
      },
    });
    return { backend: relationalBackend(client, A, A), requests };
  }

  it("calls the relational read/save RPCs through the real Supabase HTTP client", async () => {
    const reader = backendWithResponse({ workspace: fixture(), revision: 2 });
    expect(await reader.backend.read()).toEqual({ workspace: fixture(), revision: 2 });
    expect(reader.requests).toEqual([
      {
        url: "https://vexa.example/rest/v1/rpc/read_qa_workspace",
        body: { workspace_owner: A },
      },
    ]);
    const writer = backendWithResponse(3);
    expect(await writer.backend.save(fixture(), 2)).toBe(3);
    expect(writer.requests).toEqual([
      {
        url: "https://vexa.example/rest/v1/rpc/save_qa_workspace",
        body: { payload: workspaceForSave(fixture()), expected_revision: 2, workspace_owner: A },
      },
    ]);
  });

  it("preserves conflict SQLSTATE and only treats transient read errors as retryable", async () => {
    const conflict = backendWithResponse({ code: "40001", message: "Workspace changed" }, 409);
    await expect(conflict.backend.save(fixture(), 2)).rejects.toMatchObject({ code: "40001" });
    const unavailable = backendWithResponse({ message: "Service unavailable" }, 503);
    await expect(unavailable.backend.read()).rejects.toMatchObject({ retryable: true });
    const denied = backendWithResponse({ code: "42501", message: "Access denied" }, 403);
    await expect(denied.backend.read()).rejects.toMatchObject({ retryable: false });
    const invalidRevision = backendWithResponse(null);
    await expect(invalidRevision.backend.save(fixture(), 2)).rejects.toThrow(
      "invalid save revision",
    );
  });

  it("folds legacy department/section fields and removes dangling references without changing local records", () => {
    const workspace = fixture();
    workspace.projects![0].department = "IT";
    workspace.projects![0].section = "QA";
    workspace.issues[0].projectId = "deleted";
    workspace.issues[0].labels = ["login", "", " login ", "regression"];
    const payload = workspaceForSave(workspace);
    expect(payload.projects[0].department).toBe("IT / QA");
    expect(payload.projects[0]).not.toHaveProperty("section");
    expect(payload.issues[0].projectId).toBeNull();
    expect(payload.issues[0].labels).toEqual(["login", "regression"]);
    expect(workspace.projects![0].section).toBe("QA");
    expect(workspace.issues[0].projectId).toBe("deleted");
  });
  it("distinguishes a missing personal workspace from revoked shared access and invalid responses", () => {
    expect(parseCloudSnapshot(null, true)).toEqual({ workspace: emptyWorkspace(), revision: 0 });
    expect(() => parseCloudSnapshot(null, false)).toThrow("access was removed");
    expect(() =>
      parseCloudSnapshot({ workspace: emptyWorkspace(), revision: "bad" }, true),
    ).toThrow("unsupported format");
    expect(() => parseCloudSnapshot({ workspace: {}, revision: 1 }, true)).toThrow(
      "unsupported format",
    );
  });
});
