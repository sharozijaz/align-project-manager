alter table public.projects
add column if not exists start_date date;

alter table public.tasks
add column if not exists start_date date;

create index if not exists projects_start_date_idx on public.projects(start_date);
create index if not exists tasks_start_date_idx on public.tasks(start_date);

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.tasks to service_role;
