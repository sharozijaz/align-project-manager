alter table public.tasks
add column if not exists reminder text not null default 'none';

alter table public.tasks
drop constraint if exists tasks_reminder_check;

alter table public.tasks
add constraint tasks_reminder_check
check (reminder in ('none', 'due-date', 'day-before', 'two-days-before', 'week-before'));

create table if not exists public.notifications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id text references public.tasks(id) on delete cascade,
  type text not null check (type in ('task-reminder')),
  title text not null,
  message text not null,
  scheduled_for timestamptz not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, task_id, type, scheduled_for)
);

alter table public.notifications
add column if not exists email_sent_at timestamptz;

alter table public.notifications
add column if not exists email_error text;

alter table public.notifications enable row level security;

drop policy if exists "Users can manage their own notifications"
on public.notifications;

create policy "Users can manage their own notifications"
on public.notifications
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_scheduled_for_idx on public.notifications(scheduled_for);
create index if not exists notifications_read_at_idx on public.notifications(read_at);
create index if not exists notifications_email_sent_at_idx on public.notifications(email_sent_at);

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;
grant select, insert, update, delete on public.projects to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.calendar_events to service_role;
