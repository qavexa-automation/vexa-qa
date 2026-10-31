-- Run once in the Supabase SQL Editor. No service-role key is needed by the app.
create table if not exists public.qa_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.qa_workspaces enable row level security;
revoke all on public.qa_workspaces from anon;
revoke all on public.qa_workspaces from authenticated;
grant select, insert, update on public.qa_workspaces to authenticated;

create policy "Read own workspace" on public.qa_workspaces for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Create own workspace" on public.qa_workspaces for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Update own workspace" on public.qa_workspaces for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Compare revisions so two browsers cannot silently overwrite each other's work.
-- SECURITY INVOKER preserves the caller's RLS restrictions.
create or replace function public.save_qa_workspace(payload jsonb, expected_revision bigint, workspace_owner uuid)
returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Sign in before saving.'; end if;
  if workspace_owner is distinct from auth.uid() then
    raise exception 'Account changed before saving. Reload your workspace.';
  end if;
  if jsonb_typeof(payload) <> 'object'
    or not (payload ?& array['issues', 'tests', 'activity', 'sprint', 'sprintGoal'])
    or jsonb_typeof(payload->'issues') <> 'array'
    or jsonb_typeof(payload->'tests') <> 'array'
    or jsonb_typeof(payload->'activity') <> 'array'
    or jsonb_typeof(payload->'sprint') <> 'string'
    or jsonb_typeof(payload->'sprintGoal') <> 'string'
    then raise exception 'Invalid workspace format.';
  end if;
  if octet_length(payload::text) > 2000000 then
    raise exception 'Workspace exceeds 2 MB. Export a backup and reduce its size.';
  end if;
  if expected_revision = 0 then
    insert into public.qa_workspaces(user_id, data, revision)
      values (auth.uid(), payload, 1)
      on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.qa_workspaces set data = payload, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then
    raise exception 'Workspace changed in another session. Export your unsaved work, then reload.';
  end if;
  return next_revision;
end;
$$;
revoke all on function public.save_qa_workspace(jsonb, bigint, uuid) from public;
grant execute on function public.save_qa_workspace(jsonb, bigint, uuid) to authenticated;
