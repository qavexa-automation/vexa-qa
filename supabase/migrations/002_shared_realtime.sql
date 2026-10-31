-- Run after 001_workspace.sql. Existing personal workspaces remain private until shared.
begin;

create table if not exists public.qa_workspace_members (
  workspace_owner uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null,
  joined_at timestamptz not null default now(),
  primary key (workspace_owner, member_id),
  check (workspace_owner <> member_id)
);
create index if not exists qa_workspace_members_member on public.qa_workspace_members(member_id);
alter table public.qa_workspace_members enable row level security;
revoke all on public.qa_workspace_members from anon, authenticated;
grant select, delete on public.qa_workspace_members to authenticated;
create policy "See own memberships or owned team" on public.qa_workspace_members
  for select to authenticated using ((select auth.uid()) in (workspace_owner, member_id));
create policy "Owner removes members" on public.qa_workspace_members
  for delete to authenticated using ((select auth.uid()) = workspace_owner);

create table if not exists public.qa_workspace_invites (
  workspace_owner uuid primary key references auth.users(id) on delete cascade,
  code uuid not null unique default gen_random_uuid(),
  expires_at timestamptz not null default now() + interval '7 days'
);
alter table public.qa_workspace_invites enable row level security;
revoke all on public.qa_workspace_invites from anon, authenticated;
grant select, delete on public.qa_workspace_invites to authenticated;
create policy "Owner reads invitation" on public.qa_workspace_invites
  for select to authenticated using ((select auth.uid()) = workspace_owner);
create policy "Owner disables invitation" on public.qa_workspace_invites
  for delete to authenticated using ((select auth.uid()) = workspace_owner);

drop policy if exists "Read own workspace" on public.qa_workspaces;
drop policy if exists "Create own workspace" on public.qa_workspaces;
drop policy if exists "Update own workspace" on public.qa_workspaces;
create policy "Read owned or joined workspace" on public.qa_workspaces
  for select to authenticated using (
    (select auth.uid()) = user_id or exists (
      select 1 from public.qa_workspace_members m
      where m.workspace_owner = user_id and m.member_id = (select auth.uid())
    )
  );
-- Writes go through the revision-checked RPC, so clients cannot bypass conflict protection.
revoke insert, update on public.qa_workspaces from authenticated;

-- SECURITY DEFINER is required to write with direct table writes revoked.
-- This function explicitly checks ownership/membership before accessing any workspace.
create or replace function public.save_qa_workspace(payload jsonb, expected_revision bigint, workspace_owner uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception 'Sign in before saving.'; end if;
  if workspace_owner is distinct from auth.uid() and not exists (
    select 1 from public.qa_workspace_members m
    where m.workspace_owner = save_qa_workspace.workspace_owner and m.member_id = auth.uid()
  ) then raise exception 'You do not have access to this workspace.'; end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or not (payload ?& array['issues', 'tests', 'activity', 'sprint', 'sprintGoal'])
    or jsonb_typeof(payload->'issues') <> 'array'
    or jsonb_typeof(payload->'tests') <> 'array'
    or jsonb_typeof(payload->'activity') <> 'array'
    or jsonb_typeof(payload->'sprint') <> 'string'
    or jsonb_typeof(payload->'sprintGoal') <> 'string'
    then raise exception 'Invalid workspace format.'; end if;
  if octet_length(payload::text) > 2000000 then
    raise exception 'Workspace exceeds 2 MB. Export a backup and reduce its size.';
  end if;
  if expected_revision = 0 then
    insert into public.qa_workspaces(user_id, data, revision)
      values (workspace_owner, payload, 1)
      on conflict (user_id) do nothing returning revision into next_revision;
  else
    update public.qa_workspaces set data = payload, revision = revision + 1, updated_at = now()
      where user_id = workspace_owner and revision = expected_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then
    raise exception using errcode = '40001', message = 'Workspace changed. Refresh and retry the save.';
  end if;
  return next_revision;
end;
$$;

-- Definer functions issue/accept invitations without exposing membership inserts or invite codes.
create or replace function public.create_qa_workspace_invite()
returns uuid language plpgsql security definer set search_path = '' as $$
declare invitation uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before inviting teammates.'; end if;
  if not exists (select 1 from public.qa_workspaces where user_id = auth.uid()) then
    raise exception 'Save a project or update the workspace settings before inviting teammates.';
  end if;
  insert into public.qa_workspace_invites(workspace_owner) values (auth.uid())
    on conflict (workspace_owner) do update set code = gen_random_uuid(), expires_at = now() + interval '7 days'
    returning code into invitation;
  return invitation;
end;
$$;

create or replace function public.join_qa_workspace(invite_code uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in before joining a workspace.'; end if;
  select workspace_owner into owner_id from public.qa_workspace_invites
    where code = invite_code and expires_at > now() for update;
  if owner_id is null then raise exception 'This invite code is invalid or expired. Ask the owner for a new code.'; end if;
  if owner_id <> auth.uid() then
    insert into public.qa_workspace_members(workspace_owner, member_id, member_email)
      values (owner_id, auth.uid(), coalesce(auth.jwt()->>'email', 'Team member'))
      on conflict (workspace_owner, member_id) do nothing;
  end if;
  return owner_id;
end;
$$;

revoke all on function public.save_qa_workspace(jsonb, bigint, uuid) from public, anon;
revoke all on function public.create_qa_workspace_invite() from public, anon;
revoke all on function public.join_qa_workspace(uuid) from public, anon;
grant execute on function public.save_qa_workspace(jsonb, bigint, uuid) to authenticated;
grant execute on function public.create_qa_workspace_invite() to authenticated;
grant execute on function public.join_qa_workspace(uuid) to authenticated;

-- Supabase Realtime only delivers rows the subscriber is authorized to SELECT.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'qa_workspaces'
  ) then
    alter publication supabase_realtime add table public.qa_workspaces;
  end if;
end;
$$;
commit;
