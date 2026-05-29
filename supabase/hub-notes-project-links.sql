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

create table if not exists public.hub_note_spaces (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  project_ids text[] not null default '{}',
  manual_note_ids text[] not null default '{}',
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table public.hub_note_spaces enable row level security;

drop policy if exists "Allowed users can manage their own note spaces" on public.hub_note_spaces;

create policy "Allowed users can manage their own note spaces"
on public.hub_note_spaces
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create index if not exists hub_note_spaces_user_id_idx on public.hub_note_spaces(user_id);
create index if not exists hub_note_spaces_project_ids_idx on public.hub_note_spaces using gin(project_ids);
create index if not exists hub_note_spaces_manual_note_ids_idx on public.hub_note_spaces using gin(manual_note_ids);

grant select, insert, update, delete on public.hub_note_spaces to authenticated;
grant select, insert, update, delete on public.hub_note_spaces to service_role;

notify pgrst, 'reload schema';
