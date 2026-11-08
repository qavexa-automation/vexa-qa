-- The final status for quests and modifications is renamed from Done to Completed.
-- Deploy the app together with this migration: older app builds still send 'Done', which the
-- new checks reject.
begin;

alter table public.qa_issues drop constraint if exists qa_issues_status_check;
alter table public.qa_modifications drop constraint if exists qa_modifications_status_check;

update public.qa_issues set status = 'Completed' where status = 'Done';
update public.qa_modifications set status = 'Completed' where status = 'Done';

alter table public.qa_issues add constraint qa_issues_status_check
  check (status in ('Backlog', 'In progress', 'In review', 'Completed'));
alter table public.qa_modifications add constraint qa_modifications_status_check
  check (status in ('Backlog', 'In progress', 'In review', 'Completed'));

commit;
