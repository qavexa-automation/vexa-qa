-- VEXA catch-up: applies today's three database changes in one go.
-- Safe to run whether none, some, or all of them were applied before, and safe to run twice.
--   1. 20261101045702_modification_listing_dates.sql
--   2. 20261101063000_editable_modification_dates.sql
--   3. 20261101070000_rename_done_to_completed.sql
-- Paste into the Supabase SQL Editor and run. It is one transaction: all or nothing.
begin;

-- 1. Modification listing dates ------------------------------------------------------------
-- Reuse existing relational timestamps; no new data columns or backfill are needed.

-- Preserve the request date and ignore ordering-only changes when dating modifications.
create or replace function vexa_private.stamp_modification_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.created_at := old.created_at;
  if (new.project_id, new.project_name_snapshot, new.module, new.description,
      new.priority, new.status, new.developer, new.notes)
    is distinct from
     (old.project_id, old.project_name_snapshot, old.module, old.description,
      old.priority, old.status, old.developer, old.notes) then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;
revoke all on function vexa_private.stamp_modification_update() from public, anon, authenticated;
drop trigger if exists qa_modifications_stamp_update on public.qa_modifications;
create trigger qa_modifications_stamp_update
before update on public.qa_modifications
for each row execute function vexa_private.stamp_modification_update();

-- Read under caller RLS, in the same snapshot as the existing workspace content.
create or replace function public.read_qa_workspace(workspace_owner uuid)
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
          'notes', r.notes,
          'requestedAt', to_char(r.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
          'modifiedAt', to_char(r.updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
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
revoke all on function public.read_qa_workspace(uuid) from public, anon;
grant execute on function public.read_qa_workspace(uuid) to authenticated;

-- 2. Editable Date Requested / Date Modified ------------------------------------------------
-- Date Requested and Date Modified become optional, user-entered calendar dates.
-- created_at and updated_at stay as audit timestamps and are no longer shown as these dates.

alter table public.qa_modifications
  add column if not exists requested_on date,
  add column if not exists modified_on date;

-- Existing rows keep the dates they already showed, as Manila calendar days.
update public.qa_modifications set
  requested_on = coalesce(requested_on, (created_at at time zone 'Asia/Manila')::date),
  modified_on = coalesce(modified_on, (updated_at at time zone 'Asia/Manila')::date)
  where requested_on is null or modified_on is null;

-- Either date may be left empty; when both are set, the modification cannot predate the request.
alter table public.qa_modifications drop constraint if exists qa_modifications_dates_ordered;
alter table public.qa_modifications
  add constraint qa_modifications_dates_ordered check (modified_on >= requested_on);

-- Editing either date is a content change, so it advances the audit timestamp.
create or replace function vexa_private.stamp_modification_update()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.created_at := old.created_at;
  if (new.project_id, new.project_name_snapshot, new.module, new.description,
      new.priority, new.status, new.developer, new.notes, new.requested_on, new.modified_on)
    is distinct from
     (old.project_id, old.project_name_snapshot, old.module, old.description,
      old.priority, old.status, old.developer, old.notes, old.requested_on, old.modified_on) then
    new.updated_at := clock_timestamp();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

create or replace function vexa_private.save_workspace(payload jsonb, expected_revision bigint, workspace_owner uuid)
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

  insert into public.qa_modifications as target(workspace_owner, id, project_id, project_name_snapshot, module, description, priority, status, developer, notes, requested_on, modified_on, display_order)
    select workspace_owner, x.id, x."projectId", x."projectName", x."module", x."description", x."priority", x."status", x."developer", x."notes",
      x."requestedAt", x."modifiedAt",
      (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'modifications') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "projectId" text, "projectName" text, "module" text, "description" text, "priority" text, "status" text, "developer" text, "notes" text, "requestedAt" date, "modifiedAt" date)
    on conflict on constraint qa_modifications_pkey do update set
      project_id = excluded.project_id,
      project_name_snapshot = excluded.project_name_snapshot,
      module = excluded.module,
      description = excluded.description,
      priority = excluded.priority,
      status = excluded.status,
      developer = excluded.developer,
      notes = excluded.notes,
      requested_on = excluded.requested_on,
      modified_on = excluded.modified_on,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.project_id, target.project_name_snapshot, target.module, target.description, target.priority, target.status, target.developer, target.notes, target.requested_on, target.modified_on, target.display_order)
      is distinct from (excluded.project_id, excluded.project_name_snapshot, excluded.module, excluded.description, excluded.priority, excluded.status, excluded.developer, excluded.notes, excluded.requested_on, excluded.modified_on, excluded.display_order);

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

-- Read under caller RLS; the two dates now come from the editable columns.
create or replace function public.read_qa_workspace(workspace_owner uuid)
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
          'notes', r.notes,
          'requestedAt', to_char(r.requested_on, 'YYYY-MM-DD'),
          'modifiedAt', to_char(r.modified_on, 'YYYY-MM-DD')
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

-- 3. Done renamed to Completed ---------------------------------------------------------------
-- The final status for quests and modifications is renamed from Done to Completed.
-- Deploy the app together with this migration: older app builds still send 'Done', which the
-- new checks reject.

alter table public.qa_issues drop constraint if exists qa_issues_status_check;
alter table public.qa_modifications drop constraint if exists qa_modifications_status_check;

update public.qa_issues set status = 'Completed' where status = 'Done';
update public.qa_modifications set status = 'Completed' where status = 'Done';

alter table public.qa_issues add constraint qa_issues_status_check
  check (status in ('Backlog', 'In progress', 'In review', 'Completed'));
alter table public.qa_modifications add constraint qa_modifications_status_check
  check (status in ('Backlog', 'In progress', 'In review', 'Completed'));

commit;
