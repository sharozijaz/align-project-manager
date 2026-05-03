-- Personal Hub resources and markdown notes.
-- Run this in the Supabase SQL editor before relying on cross-device Personal Hub sync.

create table if not exists public.hub_resources (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  url text,
  type text not null check (type in ('inspiration', 'tools', 'assets', 'learning', 'snippets')),
  collection text,
  tags text,
  notes text,
  favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.hub_notes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  tags text,
  favorite boolean not null default false,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

alter table public.hub_resources enable row level security;
alter table public.hub_notes enable row level security;

drop policy if exists "Users can manage their own hub resources" on public.hub_resources;
drop policy if exists "Users can manage their own hub notes" on public.hub_notes;
drop policy if exists "Allowed users can manage their own hub resources" on public.hub_resources;
drop policy if exists "Allowed users can manage their own hub notes" on public.hub_notes;

create policy "Allowed users can manage their own hub resources"
on public.hub_resources
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create policy "Allowed users can manage their own hub notes"
on public.hub_notes
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create index if not exists hub_resources_user_id_idx on public.hub_resources(user_id);
create index if not exists hub_resources_type_idx on public.hub_resources(type);
create index if not exists hub_resources_collection_idx on public.hub_resources(collection);
create index if not exists hub_notes_user_id_idx on public.hub_notes(user_id);

grant select, insert, update, delete on public.hub_resources to authenticated;
grant select, insert, update, delete on public.hub_notes to authenticated;
grant select, insert, update, delete on public.hub_resources to service_role;
grant select, insert, update, delete on public.hub_notes to service_role;
