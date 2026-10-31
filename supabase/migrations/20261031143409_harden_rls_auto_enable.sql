-- Remove API execution grants from the platform's optional event-trigger helper.
-- Event triggers run as their owner and do not require client EXECUTE grants.
begin;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end;
$$;
commit;
