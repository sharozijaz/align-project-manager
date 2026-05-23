alter table public.project_shares
add column if not exists password_hash text;

alter table public.project_shares
alter column expires_at set default (now() + interval '30 days');

alter table public.client_share_links
add column if not exists password_hash text;

alter table public.client_share_links
add column if not exists expires_at timestamptz default (now() + interval '30 days');

alter table public.client_share_links
alter column expires_at set default (now() + interval '30 days');

grant select, insert, update, delete on public.project_shares to authenticated;
grant select, insert, update, delete on public.project_shares to service_role;
grant select, insert, update, delete on public.client_share_links to authenticated;
grant select, insert, update, delete on public.client_share_links to service_role;

-- Refresh PostgREST's schema cache so password-protected shares work immediately.
notify pgrst, 'reload schema';
