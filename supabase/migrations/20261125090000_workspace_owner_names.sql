-- Names each joined workspace after its owner's display name, or the part of the owner's email
-- before the @ when no name is set. Only a workspace the caller has joined is ever returned, and
-- the rest of the owner's account stays private. Safe to run more than once.
begin;

create or replace function vexa_private.list_joined_workspace_names()
returns table (workspace_owner uuid, owner_name text)
language sql stable security definer set search_path = '' as $$
  select m.workspace_owner,
    coalesce(
      case when jsonb_typeof(u.raw_user_meta_data->'full_name') = 'string'
        then nullif(btrim(u.raw_user_meta_data->>'full_name'), '') end,
      nullif(split_part(u.email, '@', 1), ''))
  from public.qa_workspace_members m
  join auth.users u on u.id = m.workspace_owner
  where m.member_id = (select auth.uid());
$$;

create or replace function public.list_qa_workspace_names()
returns table (workspace_owner uuid, owner_name text)
language sql stable security invoker set search_path = '' as $$
  select n.workspace_owner, n.owner_name from vexa_private.list_joined_workspace_names() n;
$$;

revoke all on function public.list_qa_workspace_names(), vexa_private.list_joined_workspace_names()
  from public, anon, authenticated;
grant execute on function public.list_qa_workspace_names(), vexa_private.list_joined_workspace_names()
  to authenticated;

notify pgrst, 'reload schema';
commit;
