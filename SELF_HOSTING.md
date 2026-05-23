# Self-Hosting Align

Align is local-first by default. Self-hosting is optional and is only needed if you want cloud sync, Google Calendar/Todo sync, email reminders, public share links, or multi-device access.

If you self-host, you bring your own accounts and pay your own usage costs for Supabase, Vercel or another API host, Google Cloud, and email delivery.

For a shorter step-by-step path, use `SELF_HOSTING_CHECKLIST.md`.

## Recommended Modes

- `Local only`: no backend required. Data stays in browser or desktop WebView storage. Use full JSON backups.
- `Paused`: backend is configured and you are signed in, but automatic Supabase sync is disabled. Manual upload/download still works.
- `Cloud sync`: backend is configured and automatic Supabase sync is enabled.

Export a full workspace backup before switching modes on important data.

## Required Services

The minimum hosted setup for all cloud features is:

- Supabase project for Auth, database, Row Level Security, and workspace sync.
- Vercel, Netlify Functions, Cloudflare Workers, or another serverless/API host for `/api/*` routes.
- Google Cloud OAuth credentials if you want Google sign-in, Calendar sync, or Todo sync.
- Resend or compatible email provider if you want reminder emails.

For local-only use, none of these services are required.

## Environment Variables

Frontend-safe variables can be used in `.env.local` and public hosting dashboards:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ALLOWED_EMAILS=you@example.com
VITE_AUTH_METHOD=google
VITE_APP_URL=https://your-app.example.com
VITE_PUBLIC_APP_URL=https://your-app.example.com
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-app.example.com/api/google-calendar/callback
VITE_GOOGLE_CALENDAR_ID=primary
```

Server-only variables must only be configured on the API host:

```bash
APP_URL=https://your-app.example.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ALLOWED_API_ORIGINS=https://your-app.example.com,http://localhost:5173,http://localhost:1420,http://tauri.localhost,tauri://localhost
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://your-app.example.com/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary
GOOGLE_TOKEN_ENCRYPTION_KEY=generate-a-long-random-secret
CRON_SECRET=generate-a-long-random-secret
RESEND_API_KEY=your-resend-api-key
REMINDER_EMAIL_FROM=Align <reminders@your-domain.example>
REMINDER_EMAIL_REPLY_TO=you@example.com
```

Never expose service-role keys, Google client secrets, Resend keys, cron secrets, OAuth refresh tokens, database passwords, or private keys in frontend variables or desktop builds.

Use `.env.local.example` for local development and `.env.production.example` for hosted deployments.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Run the migration scripts needed by your features:

```text
supabase/security-hardening.sql
supabase/grants.sql
supabase/google-calendar.sql
supabase/reminders.sql
supabase/email-reminders.sql
supabase/email-preferences.sql
supabase/recurring-tasks.sql
supabase/project-shares.sql
supabase/client-share-links.sql
supabase/share-passwords.sql
supabase/project-areas.sql
supabase/project-notes.sql
supabase/start-dates.sql
supabase/time-and-manual-order.sql
supabase/task-options.sql
supabase/task-subitems.sql
supabase/project-paused-status.sql
supabase/project-lifecycle-trash.sql
supabase/project-pins.sql
supabase/planned-week-start.sql
supabase/planned-month.sql
supabase/hub-notes-project-links.sql
supabase/google-todos-sync.sql
supabase/google-tasks-bridge.sql
```

5. Reload PostgREST schema cache if Supabase reports missing columns:

```sql
notify pgrst, 'reload schema';
```

6. Add allowed users if your deployment is private:

```sql
insert into public.allowed_users (email)
values ('you@example.com')
on conflict (email) do nothing;
```

## Supabase Auth URLs

In Supabase Dashboard > Authentication > URL Configuration:

```text
Site URL: https://your-app.example.com
Redirect URLs:
http://localhost:5173/**
https://your-app.example.com/**
```

For Tauri desktop OAuth redirects, also add:

```text
http://localhost:1420/**
```

## Google OAuth Setup

Google sign-in through Supabase uses this redirect URI in Google Cloud:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

Google Calendar/Todo sync uses your hosted API callback:

```text
https://your-app.example.com/api/google-calendar/callback
```

Use only the scopes you need:

- Google sign-in: configured inside Supabase Auth provider.
- Google Calendar: `https://www.googleapis.com/auth/calendar.events.owned`
- Google Tasks: `https://www.googleapis.com/auth/tasks`

Calendar/Todo sync requires server-only token handling. Do not put the Google client secret in Vite variables. `GOOGLE_TOKEN_ENCRYPTION_KEY` encrypts saved Google access and refresh tokens before storage; legacy plaintext tokens remain readable during migration, then rewrite encrypted on reconnect or refresh.

## Hosted API Routes

The current Vercel-compatible API routes live in `api/`:

```text
/api/google-calendar/connect
/api/google-calendar/callback
/api/google-calendar/status
/api/google-calendar/events
/api/google-calendar/sync
/api/google-calendar/disconnect
/api/google-sync
/api/google-todos
/api/project-share
/api/client-share
/api/reminders/check
/api/cron/sync-google-calendar
```

If you deploy somewhere other than Vercel, port these routes to your provider's serverless format.

Authenticated hosted API routes check `public.allowed_users` in addition to Supabase RLS. Add trusted emails before testing Google sync, reminders, or other signed-in hosted APIs.

## Vercel Setup

Vercel is the simplest supported hosted path because this repository already includes `vercel.json`.

Use these project settings:

```text
Install command: npm install
Build command: npm run build
Output directory: dist
```

Add frontend-safe and server-only environment variables in Vercel Project Settings. Vercel can host both the static Vite build and the `api/` serverless routes.

`vercel.json` also handles React Router fallback and rewrites for Google Todo endpoints:

```text
/api/google-todos/status
/api/google-todos/settings
/api/google-todos/sync
```

Vercel Hobby cron currently runs the Google Calendar cron once daily. Keep that schedule unless you move to a paid plan or another scheduler.

## Netlify Or Cloudflare

The frontend can run on Netlify or Cloudflare Pages, but the `api/` folder is written for Vercel-style serverless functions. To use another provider, either:

- host the frontend there and keep APIs on Vercel, setting `VITE_APP_URL` to the Vercel API/app origin, or
- port the API routes to Netlify Functions or Cloudflare Workers.

Do not put server-only secrets in frontend-only hosts.

## Cloudflare WAF

For a public hosted domain, put production behind Cloudflare or an equivalent edge firewall. Starter rules:

- challenge or rate limit `/api/*`;
- allow only expected methods on share routes, Google sync routes, OAuth callback, reminders, and cron endpoints;
- block obvious bot traffic and oversized request bodies;
- keep cron endpoints protected with `CRON_SECRET` even behind WAF.

## Cron And Email

`vercel.json` schedules:

```text
GET /api/cron/sync-google-calendar
```

Vercel Hobby cron is limited. Keep schedules conservative unless you upgrade or use another scheduler.

Set `CRON_SECRET` on the API host. Scheduled calls should send:

```text
Authorization: Bearer <CRON_SECRET>
```

Reminder emails require `RESEND_API_KEY`, `REMINDER_EMAIL_FROM`, and `REMINDER_EMAIL_REPLY_TO`.

## Desktop Builds

Desktop builds can run local-only without hosted services. If you want Google sync or share links from desktop, set `VITE_APP_URL` or `VITE_PUBLIC_APP_URL` to your hosted API/app origin before building.

After changing environment variables, rebuild the desktop app:

```bash
npm run desktop:build
```

## Smoke Test

1. Start with `Local only` mode and create a full JSON backup.
2. Configure Supabase env vars and restart the app.
3. Sign in with an allowed user.
4. Switch to `Paused` and use `Upload Now`.
5. Open the app in another browser/device and use `Download Now`.
6. Switch to `Cloud sync` only after manual upload/download works.
7. Connect Google Calendar/Todo only after hosted API routes respond successfully.

## Cost Control

- Local-only use costs nothing beyond the user's own device.
- Self-hosted users should use their own Supabase/API/email/Google accounts.
- The maintainer's private hosted backend is not intended for public users.
- Keep sync intervals conservative on free hosting plans.
