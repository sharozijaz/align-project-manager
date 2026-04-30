alter table public.projects
add column if not exists notes jsonb not null default '[]'::jsonb;

grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.projects to service_role;
