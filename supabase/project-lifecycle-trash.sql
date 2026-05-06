-- Align project lifecycle and trash migration.
-- Run this once in Supabase SQL Editor before deploying the lifecycle UI.

alter table public.projects add column if not exists completed_at timestamptz;
alter table public.projects add column if not exists archived_at timestamptz;
alter table public.projects add column if not exists deleted_at timestamptz;

alter table public.projects drop constraint if exists projects_status_check;

update public.projects
set status = 'active'
where status is null
  or status not in ('active', 'paused', 'completed', 'archived');

alter table public.projects alter column status set default 'active';

alter table public.projects
add constraint projects_status_check
check (status in ('active', 'paused', 'completed', 'archived'));

create index if not exists projects_deleted_at_idx on public.projects(deleted_at);
create index if not exists projects_status_idx on public.projects(status);

alter table public.tasks drop constraint if exists tasks_status_check;

update public.tasks
set status = case
  when status in ('not_started', 'not-started', 'backlog') then 'not_started'
  when status in ('in_progress', 'in-progress') then 'in_progress'
  when status = 'delivered' then 'delivered'
  when status in ('waiting', 'postponed', 'blocked', 'cancelled') then 'waiting'
  when status in ('review', 'under-review', 'approval-pending') then 'review'
  when status = 'approved' then 'approved'
  when status in ('done', 'completed') then 'done'
  else 'not_started'
end;

alter table public.tasks alter column status set default 'not_started';

alter table public.tasks
add constraint tasks_status_check
check (status in ('not_started', 'in_progress', 'delivered', 'waiting', 'review', 'approved', 'done'));

create index if not exists tasks_deleted_at_idx on public.tasks(deleted_at);
