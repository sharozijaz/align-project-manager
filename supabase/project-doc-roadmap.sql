alter table public.tasks
  add column if not exists linked_note_ids text[] default '{}',
  add column if not exists milestone_id uuid null;

alter table public.hub_notes
  add column if not exists milestone_id uuid null;

create table if not exists public.project_milestones (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  title text not null,
  status text not null default 'planned' check (status in ('planned', 'active', 'done')),
  sort_order integer,
  start_date date,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hub_snippets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  type text not null default 'general' check (type in ('prompt', 'checklist', 'brief-section', 'palette-note', 'general')),
  body text not null default '',
  tags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_milestones enable row level security;
alter table public.hub_snippets enable row level security;

drop policy if exists "project_milestones_owner_all" on public.project_milestones;
create policy "project_milestones_owner_all"
  on public.project_milestones
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "hub_snippets_owner_all" on public.hub_snippets;
create policy "hub_snippets_owner_all"
  on public.hub_snippets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists project_milestones_user_project_idx on public.project_milestones(user_id, project_id);
create index if not exists hub_snippets_user_type_idx on public.hub_snippets(user_id, type);

grant select, insert, update, delete on public.project_milestones to authenticated;
grant select, insert, update, delete on public.project_milestones to service_role;
grant select, insert, update, delete on public.hub_snippets to authenticated;
grant select, insert, update, delete on public.hub_snippets to service_role;

notify pgrst, 'reload schema';
