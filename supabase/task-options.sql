alter table public.tasks
drop constraint if exists tasks_priority_check;

alter table public.tasks
add constraint tasks_priority_check
check (priority in ('low', 'medium', 'high', 'urgent', 'critical'));

alter table public.tasks
drop constraint if exists tasks_status_check;

alter table public.tasks
add constraint tasks_status_check
check (status in ('backlog', 'not-started', 'in-progress', 'review', 'blocked', 'waiting', 'completed', 'cancelled'));

alter table public.projects
drop constraint if exists projects_priority_check;

alter table public.projects
add constraint projects_priority_check
check (priority in ('low', 'medium', 'high', 'urgent', 'critical'));
