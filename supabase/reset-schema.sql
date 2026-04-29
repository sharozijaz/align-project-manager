drop table if exists public.calendar_events cascade;
drop table if exists public.tasks cascade;
drop table if exists public.projects cascade;

create table public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  status text not null check (status in ('active', 'paused', 'completed')),
  priority text not null check (priority in ('high', 'low', 'medium', 'urgent')),
  start_date date,
  due_date date,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.tasks (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  project_id text references public.projects(id) on delete set null,
  category text not null check (category in ('personal', 'work', 'project', 'meeting', 'chore')),
  priority text not null check (priority in ('high', 'low', 'medium', 'urgent')),
  status text not null check (status in ('in-progress', 'not-started', 'approval-pending', 'under-review', 'approved', 'done', 'delivered', 'postponed', 'cancelled', 'waiting', 'blocked', 'review')),
  start_date date,
  due_date date,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table public.calendar_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date,
  linked_task_id text references public.tasks(id) on delete set null,
  source text not null check (source in ('local', 'google'))
);

alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_events enable row level security;

create policy "Users can manage their own projects"
on public.projects
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own tasks"
on public.tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage their own calendar events"
on public.calendar_events
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index projects_user_id_idx on public.projects(user_id);
create index tasks_user_id_idx on public.tasks(user_id);
create index tasks_due_date_idx on public.tasks(due_date);
create index tasks_start_date_idx on public.tasks(start_date);
create index projects_start_date_idx on public.projects(start_date);
create index calendar_events_user_id_idx on public.calendar_events(user_id);
create index calendar_events_start_date_idx on public.calendar_events(start_date);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.calendar_events to authenticated;
