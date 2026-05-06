# Align Security

## Current Protection

- The app is hidden behind an auth gate when Supabase is configured.
- `VITE_ALLOWED_EMAILS` blocks non-allowed emails in the UI.
- Supabase Row Level Security protects cloud data per signed-in user.

## Production Hardening

Frontend environment variables are visible in browser builds, so `VITE_ALLOWED_EMAILS` is only a UX guard. Use database-level allowlisting for real enforcement.

## GitHub Secret Safety

Never commit real `.env` files or Vercel local metadata. The repo intentionally ignores `.env`, `.env.*`, `.vercel/`, build output, logs, and TypeScript build info.

Safe to expose:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GOOGLE_REDIRECT_URI`
- `VITE_GOOGLE_CALENDAR_ID`

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `CRON_SECRET`
- Any database password or OAuth refresh token

If one of those secrets is ever pushed to GitHub, rotate it in the provider dashboard immediately. Removing it from a later commit is not enough because Git history may still contain it.

## Final Desktop Release Audit

The desktop app should be treated as a packaged frontend client. It must not include server-only secrets.

Before building or publishing an installer:

```bash
git status --short
git ls-files .env .env.local .vercel/.env.production.local
git grep -n "SUPABASE_SERVICE_ROLE_KEY\|GOOGLE_CLIENT_SECRET\|RESEND_API_KEY\|CRON_SECRET" -- . ":(exclude).env.example"
```

Expected results:

- `git status --short` should not show accidental `.env` or `.vercel` files.
- `git ls-files ...` should return nothing for real local env files.
- Secret-name matches may appear in docs, API code, and `.env.example`; real secret values must not appear in tracked files.

Desktop reminders use local device settings and Windows toast permissions. They do not need Supabase service role keys, Google client secrets, Resend keys, or cron secrets in the packaged client.

Public/client share routes must stay server-side API routes backed by service-role env vars in Vercel. They should only return read-only project/task payloads and project notes where `visibility` is `client`.

Personal Hub resources and notes remain owner/member data behind Supabase Auth and RLS. They should not be exposed by public share APIs.

## Manual Supabase SQL Checklist

For a fresh Supabase project, run:

```text
supabase/schema.sql
supabase/project-lifecycle-trash.sql
supabase/project-notes.sql
supabase/project-shares.sql
supabase/client-share-links.sql
supabase/share-passwords.sql
supabase/personal-hub.sql
supabase/feature-access.sql
supabase/security-hardening.sql
```

Some existing Supabase projects may already have these migrations. Re-run only the idempotent scripts needed for missing tables, columns, policies, or grants.

Run:

```text
supabase/security-hardening.sql
```

Then, in the same Supabase SQL Editor run or immediately after, add your own email:

```sql
insert into public.allowed_users (email)
values ('your-email@example.com')
on conflict (email) do nothing;
```

If you run the hardening SQL without adding your email, the app will correctly block cloud reads and writes until an allowed user is inserted.

This creates:

- `public.allowed_users`
- `public.is_allowed_user()`
- RLS policies that require both:
  - the row belongs to the signed-in user
  - the signed-in email exists in `allowed_users`

## Adding Another User

In Supabase SQL Editor:

```sql
insert into public.allowed_users (email)
values ('teammate@example.com')
on conflict (email) do nothing;
```

Also add the email to `VITE_ALLOWED_EMAILS` in Vercel if you want the UI gate to allow it before redeploy.

## Removing Access

```sql
delete from public.allowed_users
where lower(email) = lower('teammate@example.com');
```

Then revoke or expire their session from Supabase Auth if immediate removal is required.
