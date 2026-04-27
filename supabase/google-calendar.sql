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
