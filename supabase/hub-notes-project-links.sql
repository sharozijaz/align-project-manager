alter table public.hub_notes
add column if not exists project_ids text[] not null default '{}';

alter table public.hub_notes
add column if not exists client_visible boolean not null default false;
