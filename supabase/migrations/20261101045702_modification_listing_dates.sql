-- Reuse existing relational timestamps; no new data columns or backfill are needed.
begin;

-- Preserve the request date and ignore ordering-only changes when dating modifications.
create function vexa_private.stamp_modification_update()
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

commit;
