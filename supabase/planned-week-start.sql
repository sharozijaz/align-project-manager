alter table public.tasks
add column if not exists planned_week_start date;

create index if not exists tasks_planned_week_start_idx
on public.tasks(planned_week_start);
