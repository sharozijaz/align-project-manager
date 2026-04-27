create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  calendar_id text not null default 'primary',
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  scopes text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

revoke all on public.google_calendar_connections from anon;
revoke all on public.google_calendar_connections from authenticated;

comment on table public.google_calendar_connections is
  'Server-only Google Calendar OAuth token storage. Access this table only from trusted serverless functions with the Supabase service role key.';

create table if not exists public.google_calendar_task_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text not null,
  google_event_id text not null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

alter table public.google_calendar_task_links
add column if not exists last_synced_at timestamptz;

alter table public.google_calendar_task_links enable row level security;

revoke all on public.google_calendar_task_links from anon;
revoke all on public.google_calendar_task_links from authenticated;

grant usage on schema public to service_role;

grant select, insert, update, delete
on public.google_calendar_connections
to service_role;

grant select, insert, update, delete
on public.google_calendar_task_links
to service_role;

comment on table public.google_calendar_task_links is
  'Server-only mapping between Align task IDs and Google Calendar event IDs to prevent duplicate event creation.';
