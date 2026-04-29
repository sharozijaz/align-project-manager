alter table public.tasks
add column if not exists recurrence text not null default 'none'
check (recurrence in ('none', 'daily', 'weekly', 'monthly', 'yearly'));

alter table public.tasks
add column if not exists recurring_parent_id text;

create index if not exists tasks_recurrence_idx on public.tasks(recurrence);
create index if not exists tasks_recurring_parent_id_idx on public.tasks(recurring_parent_id);
