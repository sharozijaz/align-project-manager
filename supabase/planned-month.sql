alter table public.tasks
add column if not exists planned_month text;

create index if not exists tasks_planned_month_idx
on public.tasks(planned_month);
