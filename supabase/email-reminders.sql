alter table public.notifications
add column if not exists email_sent_at timestamptz;

alter table public.notifications
add column if not exists email_error text;

alter table public.notifications
drop constraint if exists notifications_type_check;

alter table public.notifications
add constraint notifications_type_check
check (type in ('task-reminder', 'project-due', 'weekly-summary', 'monthly-summary'));

create index if not exists notifications_email_sent_at_idx
on public.notifications(email_sent_at);

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;
