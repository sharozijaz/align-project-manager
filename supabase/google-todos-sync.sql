create table if not exists public.google_todo_sync_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  todo_list_id text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_todo_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  align_task_id text not null,
  google_task_id text not null,
  google_list_id text not null,
  google_updated_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, google_task_id, google_list_id)
);

create unique index if not exists google_todo_links_align_task_idx
on public.google_todo_links(user_id, align_task_id);

alter table public.google_todo_sync_settings enable row level security;
alter table public.google_todo_links enable row level security;

revoke all on public.google_todo_sync_settings from anon;
revoke all on public.google_todo_sync_settings from authenticated;
revoke all on public.google_todo_links from anon;
revoke all on public.google_todo_links from authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete
on public.google_todo_sync_settings
to service_role;

grant select, insert, update, delete
on public.google_todo_links
to service_role;

comment on table public.google_todo_sync_settings is
  'Server-only Google Todo sync settings for the single Align Todos list.';

comment on table public.google_todo_links is
  'Server-only mapping between Align todo IDs and Google Tasks IDs to prevent duplicate Todo sync.';
