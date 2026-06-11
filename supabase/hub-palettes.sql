-- Notes document metadata and palette assets.
-- Run this in the Supabase SQL editor to enable full Notes/Docs cloud sync.

alter table public.hub_notes
add column if not exists doc_type text not null default 'general'
check (doc_type in ('brief', 'strategy', 'research', 'palette', 'meeting', 'prompt', 'checklist', 'reference', 'general'));

alter table public.hub_notes
add column if not exists doc_status text not null default 'active'
check (doc_status in ('draft', 'active', 'review', 'archived'));

create table if not exists public.hub_palettes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  project_ids text[] not null default '{}',
  note_ids text[] not null default '{}',
  colors jsonb not null default '[]'::jsonb,
  tags text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table public.hub_palettes enable row level security;

drop policy if exists "Allowed users can manage their own palettes" on public.hub_palettes;

create policy "Allowed users can manage their own palettes"
on public.hub_palettes
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create index if not exists hub_notes_doc_type_idx on public.hub_notes(doc_type);
create index if not exists hub_notes_doc_status_idx on public.hub_notes(doc_status);
create index if not exists hub_palettes_user_id_idx on public.hub_palettes(user_id);
create index if not exists hub_palettes_project_ids_idx on public.hub_palettes using gin(project_ids);
create index if not exists hub_palettes_note_ids_idx on public.hub_palettes using gin(note_ids);

grant select, insert, update, delete on public.hub_palettes to authenticated;
grant select, insert, update, delete on public.hub_palettes to service_role;

notify pgrst, 'reload schema';
