-- Adds modular app access for future Align users.
-- Run after the core schema/security SQL. Existing allowed_users become owner-capable
-- so the current workspace owner can open Admin and create app profiles.

create table if not exists public.app_profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  display_name text,
  role text not null default 'member' check (role in ('owner', 'member', 'client')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feature_access (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles(id) on delete cascade,
  feature_key text not null check (
    feature_key in (
      'project_management',
      'resource_vault',
      'prompt_library',
      'client_pipeline',
      'documents',
      'personal_hub',
      'admin'
    )
  ),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, feature_key)
);

create index if not exists app_profiles_email_idx on public.app_profiles (lower(email));
create index if not exists feature_access_profile_idx on public.feature_access (profile_id);

alter table public.app_profiles enable row level security;
alter table public.feature_access enable row level security;

grant select, insert, update, delete on public.app_profiles to authenticated;
grant select, insert, update, delete on public.feature_access to authenticated;
revoke all on public.app_profiles from anon;
revoke all on public.feature_access from anon;

create or replace function public.is_app_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_profiles
    where active = true
      and role = 'owner'
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_allowed_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_profiles
    where active = true
      and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.allowed_users
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.app_user_has_feature(feature text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_app_owner()
  or exists (
    select 1
    from public.app_profiles profile
    left join public.feature_access access
      on access.profile_id = profile.id
      and access.feature_key = feature
      and access.enabled = true
    where profile.active = true
      and lower(profile.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (
        feature = 'project_management'
        or access.id is not null
      )
  );
$$;

revoke all on function public.is_app_owner() from public;
revoke all on function public.is_allowed_user() from public;
revoke all on function public.app_user_has_feature(text) from public;
grant execute on function public.is_app_owner() to authenticated;
grant execute on function public.is_allowed_user() to authenticated;
grant execute on function public.app_user_has_feature(text) to authenticated;

drop policy if exists "Users can read their own app profile" on public.app_profiles;
drop policy if exists "Owners can manage app profiles" on public.app_profiles;
drop policy if exists "Users can read their own feature access" on public.feature_access;
drop policy if exists "Owners can manage feature access" on public.feature_access;

create policy "Users can read their own app profile"
on public.app_profiles
for select
using (public.is_app_owner() or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Owners can manage app profiles"
on public.app_profiles
for all
using (public.is_app_owner())
with check (public.is_app_owner());

create policy "Users can read their own feature access"
on public.feature_access
for select
using (
  public.is_app_owner()
  or exists (
    select 1
    from public.app_profiles profile
    where profile.id = feature_access.profile_id
      and lower(profile.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

create policy "Owners can manage feature access"
on public.feature_access
for all
using (public.is_app_owner())
with check (public.is_app_owner());

drop policy if exists "Users can manage their own projects" on public.projects;
drop policy if exists "Users can manage their own tasks" on public.tasks;
drop policy if exists "Users can manage their own calendar events" on public.calendar_events;
drop policy if exists "Users can manage their own notifications" on public.notifications;
drop policy if exists "Users can manage their own project shares" on public.project_shares;
drop policy if exists "Users can manage their own client share links" on public.client_share_links;
drop policy if exists "Users can manage their own preferences" on public.user_preferences;
drop policy if exists "Allowed users can manage their own projects" on public.projects;
drop policy if exists "Allowed users can manage their own tasks" on public.tasks;
drop policy if exists "Allowed users can manage their own calendar events" on public.calendar_events;
drop policy if exists "Allowed users can manage their own notifications" on public.notifications;
drop policy if exists "Allowed users can manage their own project shares" on public.project_shares;
drop policy if exists "Allowed users can manage their own client share links" on public.client_share_links;
drop policy if exists "Allowed users can manage their own preferences" on public.user_preferences;
drop policy if exists "Project management users can manage their own projects" on public.projects;
drop policy if exists "Project management users can manage their own tasks" on public.tasks;
drop policy if exists "Project management users can manage their own calendar events" on public.calendar_events;
drop policy if exists "Project management users can manage their own notifications" on public.notifications;
drop policy if exists "Project management users can manage their own project shares" on public.project_shares;
drop policy if exists "Project management users can manage their own client share links" on public.client_share_links;
drop policy if exists "Project management users can manage their own preferences" on public.user_preferences;

create policy "Project management users can manage their own projects"
on public.projects
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own tasks"
on public.tasks
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own calendar events"
on public.calendar_events
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own notifications"
on public.notifications
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own project shares"
on public.project_shares
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own client share links"
on public.client_share_links
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

create policy "Project management users can manage their own preferences"
on public.user_preferences
for all
using (auth.uid() = user_id and public.app_user_has_feature('project_management'))
with check (auth.uid() = user_id and public.app_user_has_feature('project_management'));

-- Optional bootstrap: existing allowed_users can open Admin as owners through fallback.
-- To make that permanent in the new tables, add your owner profile once:
--
-- insert into public.app_profiles (email, display_name, role, active)
-- values ('your-email@example.com', 'Your Name', 'owner', true)
-- on conflict (email) do update set role = 'owner', active = true, updated_at = now();
