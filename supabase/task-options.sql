alter table public.tasks
drop constraint if exists tasks_priority_check;

update public.tasks
set priority = 'urgent'
where priority = 'critical';

alter table public.tasks
add constraint tasks_priority_check
check (priority in ('high', 'low', 'medium', 'urgent'));

alter table public.tasks
drop constraint if exists tasks_status_check;

update public.tasks
set status = case
  when status = 'completed' then 'done'
  when status = 'backlog' then 'not-started'
  else status
end
where status in ('completed', 'backlog');

alter table public.tasks
add constraint tasks_status_check
check (status in (
  'in-progress',
  'not-started',
  'approval-pending',
  'under-review',
  'approved',
  'done',
  'delivered',
  'postponed',
  'cancelled',
  'waiting',
  'blocked',
  'review'
));

alter table public.projects
drop constraint if exists projects_priority_check;

update public.projects
set priority = 'urgent'
where priority = 'critical';

alter table public.projects
add constraint projects_priority_check
check (priority in ('high', 'low', 'medium', 'urgent'));
