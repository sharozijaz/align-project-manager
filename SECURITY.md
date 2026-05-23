# Align Security

## Current Protection

- The app is hidden behind an auth gate when Supabase is configured.
- `VITE_ALLOWED_EMAILS` blocks non-allowed emails in the UI.
- Supabase Row Level Security protects cloud data per signed-in user.
- Hosted API routes enforce `public.allowed_users` before reading or writing signed-in cloud data.
- API CORS is allowlisted with `APP_URL`, `ALLOWED_API_ORIGINS`, and local development origins.
- Google sync tokens are encrypted server-side with `GOOGLE_TOKEN_ENCRYPTION_KEY` before storage.

When Supabase is not configured, Align runs in local-only mode and stores workspace data on the user's device.

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
- `VITE_PUBLIC_APP_URL`
- `VITE_AUTH_METHOD`

Never expose:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_TOKEN_ENCRYPTION_KEY`
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

Public/client share routes must stay server-side API routes backed by service-role env vars in Vercel. They should only return read-only project/task payloads and notes that are explicitly marked `client_visible`.

Personal Hub resources are never exposed by public share APIs. Personal Hub notes default to private and only appear on share links when the owner marks the note client-visible and links it to a shared project.

## Open Source Release Safety

The public desktop app should not silently depend on the maintainer's private hosted backend. Hosted sync, Google sync, share links, and email reminders must be explicit configuration choices.

For public builds:

- Leave cloud env vars empty for local-only mode.
- Do not include service-role keys or OAuth client secrets in desktop/frontend builds.
- Use `VITE_APP_URL` only when the build should call a hosted API owned by that deployment.
- Use `VITE_PUBLIC_APP_URL` only when share links should point to a public web deployment.
- Run `npm run check:public-release-env` before publishing a public desktop build. It fails if local env files would silently wire the build to a configured backend.

For a private configured build, use `ALIGN_ALLOW_CONFIGURED_BACKEND_BUILD=true npm run check:public-release-env` only when you intentionally want the build to call your own backend.

## Edge Protection

Use Cloudflare WAF or an equivalent edge firewall for hosted production deployments. Rate limit and method-filter `/api/*`, public share routes, Google OAuth callback, reminder routes, and cron routes before traffic reaches serverless functions.

## Supabase Outage And Recovery

Align treats the local workspace as the active working copy. If Supabase is unavailable, returns an error, or unexpectedly returns an empty workspace for an existing signed-in device, the app keeps local data and shows: `Cloud sync unavailable. Local data is safe on this device.`

Recovery order:

1. Keep using the local workspace if it is still visible.
2. Export a full JSON backup from Settings > Data.
3. If data is missing, restore from a JSON backup first.
4. Reconnect Supabase after the local workspace is correct, then upload manually.

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
