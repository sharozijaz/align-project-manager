-- Run this after schema.sql/reset-schema.sql/grants.sql.
-- It moves the email allowlist from frontend-only UX into Supabase RLS.
--
-- Replace the example email below before running:
-- insert into public.allowed_users (email) values ('your-email@example.com')
-- on conflict (email) do nothing;

create table if not exists public.allowed_users (
  email text primary key,
  created_at timestamptz not null default now()
);

alter table public.allowed_users enable row level security;

revoke all on public.allowed_users from anon;
revoke all on public.allowed_users from authenticated;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

revoke all on function public.is_allowed_user() from public;
grant execute on function public.is_allowed_user() to authenticated;

drop policy if exists "Users can manage their own projects" on public.projects;
drop policy if exists "Users can manage their own tasks" on public.tasks;
drop policy if exists "Users can manage their own calendar events" on public.calendar_events;

create policy "Allowed users can manage their own projects"
on public.projects
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create policy "Allowed users can manage their own tasks"
on public.tasks
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());

create policy "Allowed users can manage their own calendar events"
on public.calendar_events
for all
using (auth.uid() = user_id and public.is_allowed_user())
with check (auth.uid() = user_id and public.is_allowed_user());
