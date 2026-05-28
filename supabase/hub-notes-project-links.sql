alter table public.hub_notes
add column if not exists project_ids text[] not null default '{}';

alter table public.hub_notes
add column if not exists collection text;

alter table public.hub_notes
add column if not exists related_note_ids text[] not null default '{}';

alter table public.hub_notes
add column if not exists client_visible boolean not null default false;

create index if not exists hub_notes_collection_idx on public.hub_notes(collection);
create index if not exists hub_notes_related_note_ids_idx on public.hub_notes using gin(related_note_ids);

notify pgrst, 'reload schema';
