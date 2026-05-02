-- Adds lightweight project grouping for Personal vs Business projects.
-- Run once in Supabase SQL Editor before deploying the Project Area UI.

alter table public.projects
add column if not exists area text not null default 'business';

alter table public.projects
drop constraint if exists projects_area_check;

alter table public.projects
add constraint projects_area_check
check (area in ('business', 'personal'));

update public.projects
set area = 'business'
where area is null;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.projects to service_role;

notify pgrst, 'reload schema';
