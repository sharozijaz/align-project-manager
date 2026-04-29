create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_reminders_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can manage their own preferences"
on public.user_preferences;

create policy "Users can manage their own preferences"
on public.user_preferences
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists user_preferences_email_reminders_idx
on public.user_preferences(email_reminders_enabled);

grant select, insert, update, delete on public.user_preferences to authenticated;
grant select, insert, update, delete on public.user_preferences to service_role;
