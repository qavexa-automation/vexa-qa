-- Fresh-install baseline. Replaces the former JSON workspace migrations.
-- Apply only to an empty VEXA schema; see supabase/README.md for existing installations.
-- JSON is used only as an HTTP/RPC envelope. No table stores JSON or JSONB.
begin;

create schema if not exists vexa_private;
revoke all on schema vexa_private from public, anon, authenticated;
grant usage on schema vexa_private to authenticated;

create table public.qa_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  sprint_name text not null default 'Sprint 01',
  sprint_goal text not null default 'Ship something worth celebrating.',
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.qa_workspace_members (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  joined_at timestamptz not null default now(),
  primary key (workspace_owner, member_id),
  check (workspace_owner <> member_id)
);
create index qa_workspace_members_member_idx on public.qa_workspace_members(member_id, workspace_owner);

create table public.qa_workspace_invites (
  workspace_owner uuid primary key references public.qa_workspaces(user_id) on delete cascade,
  code uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  check (expires_at > created_at)
);

-- Record IDs retain the application's VXA-/TC- identifiers and local UUIDs.
-- Composite keys and foreign keys prevent links between different workspaces.

create table public.qa_projects (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  name text not null check (length(btrim(name)) > 0),
  department_section text not null default '',
  developer text not null default '',
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_owner, id)
);

create table public.qa_issues (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  title text not null,
  project_id text,
  description text not null default '',
  status text not null default 'Backlog' check (status in ('Backlog', 'In progress', 'In review', 'Done')),
  priority text not null default 'Medium' check (priority in ('Critical', 'High', 'Medium', 'Low')),
  issue_type text not null default 'Task' check (issue_type in ('Bug', 'Task', 'Story')),
  assignee text not null default '',
  xp integer not null default 0 check (xp >= 0),
  created_at timestamptz not null default now(),
  display_order integer not null check (display_order >= 0),
  updated_at timestamptz not null default now(),
  foreign key (workspace_owner, project_id) references public.qa_projects(workspace_owner, id) on delete set null (project_id),
  primary key (workspace_owner, id)
);
create index qa_issues_project_idx on public.qa_issues(workspace_owner, project_id);

create table public.qa_test_cases (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  title text not null,
  project_id text,
  module text not null default '',
  steps text not null default '',
  expected_result text not null default '',
  status text not null default 'Not Tested' check (status in ('Passed', 'Failed', 'Not Applicable', 'Not Tested')),
  last_run_at timestamptz,
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('Passed', 'Failed') and last_run_at is not null) or (status in ('Not Applicable', 'Not Tested') and last_run_at is null)),
  foreign key (workspace_owner, project_id) references public.qa_projects(workspace_owner, id) on delete set null (project_id),
  primary key (workspace_owner, id)
);
create index qa_test_cases_project_idx on public.qa_test_cases(workspace_owner, project_id);

create table public.qa_modifications (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  project_id text,
  project_name_snapshot text not null,
  module text not null default '',
  description text not null,
  priority text not null default 'Medium' check (priority in ('Critical', 'High', 'Medium', 'Low')),
  status text not null default 'Backlog' check (status in ('Backlog', 'In progress', 'In review', 'Done')),
  developer text not null default '',
  notes text not null default '',
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_owner, project_id) references public.qa_projects(workspace_owner, id) on delete set null (project_id),
  primary key (workspace_owner, id)
);
create index qa_modifications_project_idx on public.qa_modifications(workspace_owner, project_id);

create table public.qa_deployments (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  project_id text,
  project_name_snapshot text not null,
  environment text not null check (environment in ('Development', 'Staging', 'Production')),
  version text not null check (length(btrim(version)) > 0),
  deployment_date date not null,
  status text not null default 'Planned' check (status in ('Planned', 'In progress', 'Deployed', 'Failed', 'Rolled back')),
  notes text not null default '',
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_owner, project_id) references public.qa_projects(workspace_owner, id) on delete set null (project_id),
  primary key (workspace_owner, id)
);
create index qa_deployments_project_idx on public.qa_deployments(workspace_owner, project_id);

create table public.qa_activity (
  workspace_owner uuid not null references public.qa_workspaces(user_id) on delete cascade,
  id text not null check (length(btrim(id)) between 1 and 100),
  description text not null,
  occurred_at timestamptz not null,
  kind text not null check (kind in ('issue', 'test', 'achievement')),
  display_order integer not null check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_owner, id)
);

create index qa_issues_status_idx on public.qa_issues(workspace_owner, status, priority);
create index qa_test_cases_status_idx on public.qa_test_cases(workspace_owner, status);
create index qa_deployments_date_idx on public.qa_deployments(workspace_owner, deployment_date desc);
create index qa_activity_date_idx on public.qa_activity(workspace_owner, occurred_at desc);

create table public.qa_issue_labels (
  workspace_owner uuid not null,
  issue_id text not null,
  label text not null check (length(btrim(label)) > 0),
  display_order integer not null check (display_order >= 0),
  primary key (workspace_owner, issue_id, label),
  foreign key (workspace_owner, issue_id) references public.qa_issues(workspace_owner, id) on delete cascade
);

-- The API can read authorized records. All content writes use the transaction below.
-- No direct table grants can bypass optimistic revision checking.
alter table public.qa_workspace_members enable row level security;
alter table public.qa_workspace_invites enable row level security;
revoke all on public.qa_workspace_members, public.qa_workspace_invites from public, anon, authenticated;
grant select, delete on public.qa_workspace_members, public.qa_workspace_invites to authenticated;
create policy members_read on public.qa_workspace_members for select to authenticated
  using ((select auth.uid()) in (workspace_owner, member_id));
create policy members_remove on public.qa_workspace_members for delete to authenticated
  using ((select auth.uid()) = workspace_owner);
create policy invites_read on public.qa_workspace_invites for select to authenticated
  using ((select auth.uid()) = workspace_owner);
create policy invites_disable on public.qa_workspace_invites for delete to authenticated
  using ((select auth.uid()) = workspace_owner);

alter table public.qa_workspaces enable row level security;
revoke all on public.qa_workspaces from public, anon, authenticated;
grant select on public.qa_workspaces to authenticated;
create policy workspace_read on public.qa_workspaces for select to authenticated
  using ((select auth.uid()) = user_id or user_id in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_projects enable row level security;
revoke all on public.qa_projects from public, anon, authenticated;
grant select on public.qa_projects to authenticated;
create policy workspace_read on public.qa_projects for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_issues enable row level security;
revoke all on public.qa_issues from public, anon, authenticated;
grant select on public.qa_issues to authenticated;
create policy workspace_read on public.qa_issues for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_test_cases enable row level security;
revoke all on public.qa_test_cases from public, anon, authenticated;
grant select on public.qa_test_cases to authenticated;
create policy workspace_read on public.qa_test_cases for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_modifications enable row level security;
revoke all on public.qa_modifications from public, anon, authenticated;
grant select on public.qa_modifications to authenticated;
create policy workspace_read on public.qa_modifications for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_deployments enable row level security;
revoke all on public.qa_deployments from public, anon, authenticated;
grant select on public.qa_deployments to authenticated;
create policy workspace_read on public.qa_deployments for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_activity enable row level security;
revoke all on public.qa_activity from public, anon, authenticated;
grant select on public.qa_activity to authenticated;
create policy workspace_read on public.qa_activity for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

alter table public.qa_issue_labels enable row level security;
revoke all on public.qa_issue_labels from public, anon, authenticated;
grant select on public.qa_issue_labels to authenticated;
create policy workspace_read on public.qa_issue_labels for select to authenticated
  using ((select auth.uid()) = workspace_owner or workspace_owner in (
    select m.workspace_owner from public.qa_workspace_members m where m.member_id = (select auth.uid())
  ));

-- One SQL statement reads all tables from the same MVCC snapshot, under caller RLS.
-- The response is JSON for HTTP transport, never a persisted document column.
create function public.read_qa_workspace(workspace_owner uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('revision', w.revision, 'workspace', jsonb_build_object(
    'sprint', w.sprint_name, 'sprintGoal', w.sprint_goal,
    'projects', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'department', r.department_section,
          'developer', r.developer
        ))
      ) order by r.display_order, r.id)
      from public.qa_projects r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'issues', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'projectId', r.project_id,
          'description', r.description,
          'status', r.status,
          'priority', r.priority,
          'type', r.issue_type,
          'assignee', r.assignee,
          'xp', r.xp,
          'createdAt', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'labels', coalesce((select jsonb_agg(l.label order by l.display_order, l.label) from public.qa_issue_labels l where l.workspace_owner = r.workspace_owner and l.issue_id = r.id), '[]'::jsonb)
        ))
      ) order by r.display_order, r.id)
      from public.qa_issues r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'tests', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'projectId', r.project_id,
          'suite', r.module,
          'steps', r.steps,
          'expected', r.expected_result,
          'status', r.status
        )) || jsonb_build_object('lastRun', to_char(r.last_run_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
      ) order by r.display_order, r.id)
      from public.qa_test_cases r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'modifications', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'projectId', coalesce(r.project_id, ''),
          'projectName', r.project_name_snapshot,
          'module', r.module,
          'description', r.description,
          'priority', r.priority,
          'status', r.status,
          'developer', r.developer,
          'notes', r.notes
        ))
      ) order by r.display_order, r.id)
      from public.qa_modifications r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'deployments', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'projectId', coalesce(r.project_id, ''),
          'projectName', r.project_name_snapshot,
          'environment', r.environment,
          'version', r.version,
          'deploymentDate', to_char(r.deployment_date, 'YYYY-MM-DD'),
          'status', r.status,
          'notes', r.notes
        ))
      ) order by r.display_order, r.id)
      from public.qa_deployments r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'text', r.description,
          'date', to_char(r.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'kind', r.kind
        ))
      ) order by r.display_order, r.id)
      from public.qa_activity r where r.workspace_owner = w.user_id
    ), '[]'::jsonb)
  )) from public.qa_workspaces w where w.user_id = workspace_owner;
$$;

-- Privileged implementation is kept outside the exposed public schema.
-- Membership is locked until commit, so removal cannot race an authorized save.
create function vexa_private.save_workspace(payload jsonb, expected_revision bigint, workspace_owner uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  current_revision bigint;
begin
  if caller is null then raise exception 'Sign in before saving.' using errcode = '42501'; end if;
  if workspace_owner is null or expected_revision is null or expected_revision < 0 then
    raise exception 'Invalid workspace owner or revision.' using errcode = '22023';
  end if;
  if workspace_owner <> caller then
    perform 1 from public.qa_workspace_members m
      where m.workspace_owner = save_workspace.workspace_owner and m.member_id = caller for share;
    if not found then raise exception 'You do not have access to this workspace.' using errcode = '42501'; end if;
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or not (payload ?& array['projects', 'issues', 'tests', 'modifications', 'deployments', 'activity', 'sprint', 'sprintGoal'])
    or jsonb_typeof(payload->'sprint') <> 'string'
    or jsonb_typeof(payload->'sprintGoal') <> 'string'
    or exists (select 1 from unnest(array['projects', 'issues', 'tests', 'modifications', 'deployments', 'activity']) k
      where jsonb_typeof(payload->k) <> 'array') then
    raise exception 'Invalid workspace format.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(payload->'issues') issue
    where jsonb_typeof(issue->'labels') is distinct from 'array') then
    raise exception 'Quest labels must be an array of strings.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(payload->'issues') issue
    cross join lateral jsonb_array_elements(issue->'labels') label
    where jsonb_typeof(label) <> 'string') then
    raise exception 'Quest labels must be strings.' using errcode = '22023';
  end if;

  if expected_revision = 0 then
    if caller <> workspace_owner then raise exception 'Only the owner can create a workspace.' using errcode = '42501'; end if;
    insert into public.qa_workspaces(user_id) values (workspace_owner) on conflict (user_id) do nothing;
    if not found then raise exception 'Workspace changed. Refresh and retry.' using errcode = '40001'; end if;
  end if;
  select w.revision into current_revision from public.qa_workspaces w
    where w.user_id = workspace_owner for update;
  if current_revision is null or (expected_revision <> 0 and current_revision <> expected_revision) then
    raise exception 'Workspace changed. Refresh and retry.' using errcode = '40001';
  end if;

  -- Upsert only changed rows; keep row creation timestamps and stable record IDs.
  insert into public.qa_projects as target(workspace_owner, id, name, department_section, developer, display_order)
    select workspace_owner, x.id, x."name", x."department", x."developer", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'projects') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "name" text, "department" text, "developer" text)
    on conflict on constraint qa_projects_pkey do update set
      name = excluded.name,
      department_section = excluded.department_section,
      developer = excluded.developer,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.name, target.department_section, target.developer, target.display_order)
      is distinct from (excluded.name, excluded.department_section, excluded.developer, excluded.display_order);

  insert into public.qa_issues as target(workspace_owner, id, title, project_id, description, status, priority, issue_type, assignee, xp, created_at, display_order)
    select workspace_owner, x.id, x."title", x."projectId", x."description", x."status", x."priority", x."type", x."assignee", x."xp", x."createdAt", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'issues') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "title" text, "projectId" text, "description" text, "status" text, "priority" text, "type" text, "assignee" text, "xp" integer, "createdAt" timestamptz)
    on conflict on constraint qa_issues_pkey do update set
      title = excluded.title,
      project_id = excluded.project_id,
      description = excluded.description,
      status = excluded.status,
      priority = excluded.priority,
      issue_type = excluded.issue_type,
      assignee = excluded.assignee,
      xp = excluded.xp,
      created_at = excluded.created_at,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.title, target.project_id, target.description, target.status, target.priority, target.issue_type, target.assignee, target.xp, target.created_at, target.display_order)
      is distinct from (excluded.title, excluded.project_id, excluded.description, excluded.status, excluded.priority, excluded.issue_type, excluded.assignee, excluded.xp, excluded.created_at, excluded.display_order);

  insert into public.qa_test_cases as target(workspace_owner, id, title, project_id, module, steps, expected_result, status, last_run_at, display_order)
    select workspace_owner, x.id, x."title", x."projectId", x."suite", x."steps", x."expected", x."status", x."lastRun", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'tests') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "title" text, "projectId" text, "suite" text, "steps" text, "expected" text, "status" text, "lastRun" timestamptz)
    on conflict on constraint qa_test_cases_pkey do update set
      title = excluded.title,
      project_id = excluded.project_id,
      module = excluded.module,
      steps = excluded.steps,
      expected_result = excluded.expected_result,
      status = excluded.status,
      last_run_at = excluded.last_run_at,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.title, target.project_id, target.module, target.steps, target.expected_result, target.status, target.last_run_at, target.display_order)
      is distinct from (excluded.title, excluded.project_id, excluded.module, excluded.steps, excluded.expected_result, excluded.status, excluded.last_run_at, excluded.display_order);

  insert into public.qa_modifications as target(workspace_owner, id, project_id, project_name_snapshot, module, description, priority, status, developer, notes, display_order)
    select workspace_owner, x.id, x."projectId", x."projectName", x."module", x."description", x."priority", x."status", x."developer", x."notes", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'modifications') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "projectId" text, "projectName" text, "module" text, "description" text, "priority" text, "status" text, "developer" text, "notes" text)
    on conflict on constraint qa_modifications_pkey do update set
      project_id = excluded.project_id,
      project_name_snapshot = excluded.project_name_snapshot,
      module = excluded.module,
      description = excluded.description,
      priority = excluded.priority,
      status = excluded.status,
      developer = excluded.developer,
      notes = excluded.notes,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.project_id, target.project_name_snapshot, target.module, target.description, target.priority, target.status, target.developer, target.notes, target.display_order)
      is distinct from (excluded.project_id, excluded.project_name_snapshot, excluded.module, excluded.description, excluded.priority, excluded.status, excluded.developer, excluded.notes, excluded.display_order);

  insert into public.qa_deployments as target(workspace_owner, id, project_id, project_name_snapshot, environment, version, deployment_date, status, notes, display_order)
    select workspace_owner, x.id, x."projectId", x."projectName", x."environment", x."version", x."deploymentDate", x."status", x."notes", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'deployments') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "projectId" text, "projectName" text, "environment" text, "version" text, "deploymentDate" date, "status" text, "notes" text)
    on conflict on constraint qa_deployments_pkey do update set
      project_id = excluded.project_id,
      project_name_snapshot = excluded.project_name_snapshot,
      environment = excluded.environment,
      version = excluded.version,
      deployment_date = excluded.deployment_date,
      status = excluded.status,
      notes = excluded.notes,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.project_id, target.project_name_snapshot, target.environment, target.version, target.deployment_date, target.status, target.notes, target.display_order)
      is distinct from (excluded.project_id, excluded.project_name_snapshot, excluded.environment, excluded.version, excluded.deployment_date, excluded.status, excluded.notes, excluded.display_order);

  insert into public.qa_activity as target(workspace_owner, id, description, occurred_at, kind, display_order)
    select workspace_owner, x.id, x."text", x."date", x."kind", (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'activity') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "text" text, "date" timestamptz, "kind" text)
    on conflict on constraint qa_activity_pkey do update set
      description = excluded.description,
      occurred_at = excluded.occurred_at,
      kind = excluded.kind,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.description, target.occurred_at, target.kind, target.display_order)
      is distinct from (excluded.description, excluded.occurred_at, excluded.kind, excluded.display_order);

  -- Labels are child rows, not an array/JSON column. Reject duplicate labels atomically.
  insert into public.qa_issue_labels as target(workspace_owner, issue_id, label, display_order)
    select workspace_owner, issue->>'id', label.value #>> '{}', (label.ordinality - 1)::integer
    from jsonb_array_elements(payload->'issues') issue
    cross join lateral jsonb_array_elements(issue->'labels') with ordinality as label(value, ordinality)
    on conflict on constraint qa_issue_labels_pkey do update set display_order = excluded.display_order
    where target.display_order is distinct from excluded.display_order;
  delete from public.qa_issue_labels l where l.workspace_owner = save_workspace.workspace_owner and not exists (
    select 1 from jsonb_array_elements(payload->'issues') issue
    cross join lateral jsonb_array_elements_text(issue->'labels') as labels(value)
    where issue->>'id' = l.issue_id and labels.value = l.label
  );
  delete from public.qa_issues r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'issues') item where item->>'id' = r.id);
  delete from public.qa_test_cases r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'tests') item where item->>'id' = r.id);
  delete from public.qa_modifications r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'modifications') item where item->>'id' = r.id);
  delete from public.qa_deployments r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'deployments') item where item->>'id' = r.id);
  delete from public.qa_activity r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'activity') item where item->>'id' = r.id);
  delete from public.qa_projects r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'projects') item where item->>'id' = r.id);

  update public.qa_workspaces w set sprint_name = payload->>'sprint', sprint_goal = payload->>'sprintGoal',
    revision = case when expected_revision = 0 then 1 else w.revision + 1 end, updated_at = now()
    where w.user_id = workspace_owner returning w.revision into current_revision;
  return current_revision;
end;
$$;

create function public.save_qa_workspace(payload jsonb, expected_revision bigint, workspace_owner uuid)
returns bigint language sql security invoker set search_path = '' as $$
  select vexa_private.save_workspace(payload, expected_revision, workspace_owner);
$$;

create function vexa_private.create_workspace_invite()
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before inviting teammates.' using errcode = '42501'; end if;
  if not exists (select 1 from public.qa_workspaces w where w.user_id = auth.uid()) then
    raise exception 'Save your workspace before inviting teammates.';
  end if;
  insert into public.qa_workspace_invites(workspace_owner) values (auth.uid())
    on conflict (workspace_owner) do update set code = gen_random_uuid(), created_at = now(), expires_at = now() + interval '7 days'
    returning code into invitation;
  return invitation;
end;
$$;
create function public.create_qa_workspace_invite()
returns uuid language sql security invoker set search_path = '' as $$
  select vexa_private.create_workspace_invite();
$$;

create function vexa_private.join_workspace(invite_code uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before joining a workspace.' using errcode = '42501'; end if;
  select i.workspace_owner into owner_id from public.qa_workspace_invites i
    where i.code = invite_code and i.expires_at > now() for update;
  if owner_id is null then raise exception 'This invite code is invalid or expired. Ask the owner for a new code.'; end if;
  if owner_id <> auth.uid() then
    insert into public.qa_workspace_members(workspace_owner, member_id, member_email)
      values (owner_id, auth.uid(), coalesce(auth.jwt()->>'email', 'Team member'))
      on conflict (workspace_owner, member_id) do nothing;
  end if;
  return owner_id;
end;
$$;
create function public.join_qa_workspace(invite_code uuid)
returns uuid language sql security invoker set search_path = '' as $$
  select vexa_private.join_workspace(invite_code);
$$;

-- Functions receive no implicit PUBLIC/anon execute permissions.
revoke all on function public.read_qa_workspace(uuid) from public, anon, authenticated;
grant execute on function public.read_qa_workspace(uuid) to authenticated;
revoke all on function public.save_qa_workspace(jsonb, bigint, uuid) from public, anon, authenticated;
grant execute on function public.save_qa_workspace(jsonb, bigint, uuid) to authenticated;
revoke all on function public.create_qa_workspace_invite() from public, anon, authenticated;
grant execute on function public.create_qa_workspace_invite() to authenticated;
revoke all on function public.join_qa_workspace(uuid) from public, anon, authenticated;
grant execute on function public.join_qa_workspace(uuid) to authenticated;
revoke all on function vexa_private.save_workspace(jsonb, bigint, uuid) from public, anon, authenticated;
grant execute on function vexa_private.save_workspace(jsonb, bigint, uuid) to authenticated;
revoke all on function vexa_private.create_workspace_invite() from public, anon, authenticated;
grant execute on function vexa_private.create_workspace_invite() to authenticated;
revoke all on function vexa_private.join_workspace(uuid) from public, anon, authenticated;
grant execute on function vexa_private.join_workspace(uuid) to authenticated;

-- One event per committed workspace save; clients refetch a consistent relational snapshot.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime'
    and schemaname = 'public' and tablename = 'qa_workspaces') then
    alter publication supabase_realtime add table public.qa_workspaces;
  end if;
end;
$$;

commit;
