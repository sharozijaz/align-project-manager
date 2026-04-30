-- Adds optional task/project times and manual ordering.
-- Run this once in the Supabase SQL editor, then upload/download sync will preserve these fields.

alter table public.projects add column if not exists start_time time;
alter table public.projects add column if not exists due_time time;
alter table public.projects add column if not exists sort_order numeric;

alter table public.tasks add column if not exists start_time time;
alter table public.tasks add column if not exists due_time time;
alter table public.tasks add column if not exists sort_order numeric;

create index if not exists projects_user_sort_order_idx on public.projects (user_id, sort_order);
create index if not exists tasks_user_sort_order_idx on public.tasks (user_id, sort_order);

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.tasks to service_role;

-- Refresh PostgREST's schema cache so the app can use the new columns immediately.
notify pgrst, 'reload schema';
