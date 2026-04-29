alter table public.notifications
add column if not exists email_sent_at timestamptz;

alter table public.notifications
add column if not exists email_error text;

create index if not exists notifications_email_sent_at_idx
on public.notifications(email_sent_at);

grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update, delete on public.notifications to service_role;
