-- Project lifecycle status. Apply after the modification attachments migration.
-- Existing projects start at Not Started. Saves from older clients preserve an existing status.
begin;

alter table public.qa_projects add column status text not null default 'Not Started'
  constraint qa_projects_status_check check (status in (
    'Not Started', 'Requirements Gathering', 'Analysis & Design', 'In Development',
    'For QA Testing', 'For UAT', 'For Deployment', 'Deployed', 'On Hold', 'Cancelled'
  ));

-- Retain the revision, membership, attachment, and calendar behavior of the current RPCs.
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
  -- A workspace saved before the Activity Calendar existed carries no calendar array at all.
  if payload ? 'calendarEvents' and jsonb_typeof(payload->'calendarEvents') <> 'array' then
    raise exception 'Invalid workspace format.' using errcode = '22023';
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

  -- Reject explicit null/non-string statuses; older clients may omit the field.
  if exists (select 1 from jsonb_array_elements(payload->'projects') project
    where project ? 'status' and jsonb_typeof(project->'status') is distinct from 'string') then
    raise exception 'Invalid project status.' using errcode = '22023';
  end if;

  -- Upsert only changed rows; keep row creation timestamps and stable record IDs.
  insert into public.qa_projects as target(workspace_owner, id, name, department_section, developer, status, display_order)
    select workspace_owner, x.id, x."name", x."department", x."developer",
      coalesce(x."status", (select p.status from public.qa_projects p
        where p.workspace_owner = save_workspace.workspace_owner and p.id = x.id), 'Not Started'),
      (item.ordinality - 1)::integer
    from jsonb_array_elements(payload->'projects') with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "name" text, "department" text, "developer" text, "status" text)
    on conflict on constraint qa_projects_pkey do update set
      name = excluded.name,
      department_section = excluded.department_section,
      developer = excluded.developer,
      status = excluded.status,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.name, target.department_section, target.developer, target.status, target.display_order)
      is distinct from (excluded.name, excluded.department_section, excluded.developer, excluded.status, excluded.display_order);

  -- Inserted after projects so a linked project row already exists for the foreign key.
  -- An all-day activity sends empty time strings, which become NULL times.
  insert into public.qa_calendar_events as target(workspace_owner, id, title, kind, status, start_date, end_date, all_day, start_time, end_time, project_id, location, notes, display_order)
    select workspace_owner, x.id, x."title", x."kind", x."status", x."startDate", x."endDate", x."allDay",
      nullif(btrim(x."startTime"), '')::time, nullif(btrim(x."endTime"), '')::time,
      x."projectId", x."location", x."notes", (item.ordinality - 1)::integer
    from jsonb_array_elements(coalesce(payload->'calendarEvents', '[]'::jsonb)) with ordinality as item(value, ordinality)
    cross join lateral jsonb_to_record(item.value) as x("id" text, "title" text, "kind" text, "status" text, "startDate" date, "endDate" date, "allDay" boolean, "startTime" text, "endTime" text, "projectId" text, "location" text, "notes" text)
    on conflict on constraint qa_calendar_events_pkey do update set
      title = excluded.title,
      kind = excluded.kind,
      status = excluded.status,
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      all_day = excluded.all_day,
      start_time = excluded.start_time,
      end_time = excluded.end_time,
      project_id = excluded.project_id,
      location = excluded.location,
      notes = excluded.notes,
      display_order = excluded.display_order,
      updated_at = now()
    where (target.title, target.kind, target.status, target.start_date, target.end_date, target.all_day, target.start_time, target.end_time, target.project_id, target.location, target.notes, target.display_order)
      is distinct from (excluded.title, excluded.kind, excluded.status, excluded.start_date, excluded.end_date, excluded.all_day, excluded.start_time, excluded.end_time, excluded.project_id, excluded.location, excluded.notes, excluded.display_order);

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

  -- Attachment rows follow their modification so the composite foreign key always resolves.
  insert into public.qa_modification_attachments as target(workspace_owner, modification_id, id, file_name, stored_name, content_type, byte_size, stored_size, encoding, storage_path, uploaded_at, display_order)
    select workspace_owner, modification->>'id', x.id, x."name", x."storedName", x."contentType", x."size", x."storedSize", x."encoding", x."path", x."uploadedAt", (attachment.ordinality - 1)::integer
    from jsonb_array_elements(payload->'modifications') modification
    cross join lateral jsonb_array_elements(coalesce(modification->'attachments', '[]'::jsonb)) with ordinality as attachment(value, ordinality)
    cross join lateral jsonb_to_record(attachment.value) as x("id" text, "name" text, "storedName" text, "contentType" text, "size" bigint, "storedSize" bigint, "encoding" text, "path" text, "uploadedAt" timestamptz)
    on conflict on constraint qa_modification_attachments_pkey do update set
      modification_id = excluded.modification_id,
      file_name = excluded.file_name,
      stored_name = excluded.stored_name,
      content_type = excluded.content_type,
      byte_size = excluded.byte_size,
      stored_size = excluded.stored_size,
      encoding = excluded.encoding,
      storage_path = excluded.storage_path,
      uploaded_at = excluded.uploaded_at,
      display_order = excluded.display_order
    where (target.modification_id, target.file_name, target.stored_name, target.content_type, target.byte_size, target.stored_size, target.encoding, target.storage_path, target.uploaded_at, target.display_order)
      is distinct from (excluded.modification_id, excluded.file_name, excluded.stored_name, excluded.content_type, excluded.byte_size, excluded.stored_size, excluded.encoding, excluded.storage_path, excluded.uploaded_at, excluded.display_order);

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
  delete from public.qa_modification_attachments a where a.workspace_owner = save_workspace.workspace_owner
    and not exists (
      select 1 from jsonb_array_elements(payload->'modifications') modification
      cross join lateral jsonb_array_elements(coalesce(modification->'attachments', '[]'::jsonb)) item
      where item->>'id' = a.id
    );
  delete from public.qa_modifications r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'modifications') item where item->>'id' = r.id);
  delete from public.qa_deployments r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'deployments') item where item->>'id' = r.id);
  delete from public.qa_activity r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'activity') item where item->>'id' = r.id);
  delete from public.qa_calendar_events r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(coalesce(payload->'calendarEvents', '[]'::jsonb)) item where item->>'id' = r.id);
  delete from public.qa_projects r where r.workspace_owner = save_workspace.workspace_owner
    and not exists (select 1 from jsonb_array_elements(payload->'projects') item where item->>'id' = r.id);

  update public.qa_workspaces w set sprint_name = payload->>'sprint', sprint_goal = payload->>'sprintGoal',
    revision = case when expected_revision = 0 then 1 else w.revision + 1 end, updated_at = now()
    where w.user_id = workspace_owner returning w.revision into current_revision;
  return current_revision;
end;
$$;

create or replace function public.read_qa_workspace(workspace_owner uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('revision', w.revision, 'workspace', jsonb_build_object(
    'sprint', w.sprint_name, 'sprintGoal', w.sprint_goal,
    'calendarEvents', coalesce((
      select jsonb_agg((
        jsonb_build_object(
          'id', r.id,
          'title', r.title,
          'kind', r.kind,
          'status', r.status,
          'startDate', to_char(r.start_date, 'YYYY-MM-DD'),
          'endDate', to_char(r.end_date, 'YYYY-MM-DD'),
          'allDay', r.all_day,
          'startTime', coalesce(to_char(r.start_time, 'HH24:MI'), ''),
          'endTime', coalesce(to_char(r.end_time, 'HH24:MI'), ''),
          'projectId', coalesce(r.project_id, ''),
          'location', r.location,
          'notes', r.notes
        )
      ) order by r.display_order, r.id)
      from public.qa_calendar_events r where r.workspace_owner = w.user_id
    ), '[]'::jsonb),
    'projects', coalesce((
      select jsonb_agg((
        jsonb_strip_nulls(jsonb_build_object(
          'id', r.id,
          'name', r.name,
          'department', r.department_section,
          'developer', r.developer,
          'status', r.status
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
          'modifiedAt', to_char(r.modified_on, 'YYYY-MM-DD'),
          'attachments', coalesce((
            select jsonb_agg(jsonb_build_object(
              'id', a.id,
              'name', a.file_name,
              'storedName', a.stored_name,
              'contentType', a.content_type,
              'size', a.byte_size,
              'storedSize', a.stored_size,
              'encoding', a.encoding,
              'path', a.storage_path,
              'uploadedAt', to_char(a.uploaded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
            ) order by a.display_order, a.id)
            from public.qa_modification_attachments a
            where a.workspace_owner = r.workspace_owner and a.modification_id = r.id
          ), '[]'::jsonb)
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

commit;
