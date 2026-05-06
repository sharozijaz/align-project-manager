-- Align paused project status support.
-- Run this once in Supabase SQL Editor after project-lifecycle-trash.sql.

alter table public.projects drop constraint if exists projects_status_check;

update public.projects
set status = 'active'
where status is null
  or status not in ('active', 'paused', 'completed', 'archived');

alter table public.projects alter column status set default 'active';

alter table public.projects
add constraint projects_status_check
check (status in ('active', 'paused', 'completed', 'archived'));

notify pgrst, 'reload schema';
