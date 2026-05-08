create table if not exists public.google_task_bridge_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  today_list_id text,
  inbox_list_id text,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.google_task_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  align_task_id text not null,
  google_task_id text not null,
  google_list_id text not null,
  sync_type text not null default 'today',
  google_updated_at timestamptz,
  imported_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, google_task_id, google_list_id)
);

create unique index if not exists google_task_links_align_task_type_idx
on public.google_task_links(user_id, align_task_id, sync_type);

alter table public.google_task_bridge_settings enable row level security;
alter table public.google_task_links enable row level security;

revoke all on public.google_task_bridge_settings from anon;
revoke all on public.google_task_bridge_settings from authenticated;
revoke all on public.google_task_links from anon;
revoke all on public.google_task_links from authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete
on public.google_task_bridge_settings
to service_role;

grant select, insert, update, delete
on public.google_task_links
to service_role;

comment on table public.google_task_bridge_settings is
  'Server-only Google Tasks bridge settings for Align Today and Align Inbox lists.';

comment on table public.google_task_links is
  'Server-only mapping between Align task IDs and Google Tasks IDs to prevent duplicate mobile bridge sync.';
