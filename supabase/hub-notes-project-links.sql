alter table public.hub_notes
add column if not exists project_ids text[] not null default '{}';
