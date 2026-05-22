# Align Deployment

## Recommended Host

Use Vercel for the easiest full hosted deployment because this repo includes both the Vite app and Vercel-compatible `api/` routes.

Netlify or Cloudflare Pages can host the static frontend, but the `api/` routes need to be ported or hosted separately.

For complete bring-your-own-backend instructions, including Supabase, Google OAuth, cron, email, desktop, and cost-control notes, see `SELF_HOSTING.md`.

## Build Settings

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Vercel Notes

- `vercel.json` handles React Router refreshes.
- `vercel.json` rewrites Google Todo routes to the shared API handler.
- `vercel.json` schedules `/api/cron/sync-google-calendar` once daily.
- Vercel Hobby cron is limited; keep the daily schedule unless you upgrade or move cron elsewhere.
- Set server-only secrets only in Vercel environment variables, never in Vite-only variables.

## Environment Variables

Add these in the hosting provider dashboard. See `.env.production.example` for the same values in copyable form.

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ALLOWED_EMAILS=you@example.com
VITE_APP_URL=https://your-deployed-url
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-deployed-url/api/google-calendar/callback
VITE_GOOGLE_CALENDAR_ID=primary
APP_URL=https://your-deployed-url
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://your-deployed-url/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary
CRON_SECRET=generate-a-long-random-secret
```

Use the same values that are currently working in `.env.local`.

`VITE_APP_URL` must be the full app URL with `https://`. Do not use the Supabase project URL here.

Google Calendar sync will also need a backend/serverless callback for the OAuth code exchange before the Connect button can complete. Keep Google client secrets out of Vite environment variables.
Run `supabase/google-calendar.sql` before using the Google Calendar Connect button.

## Background Sync

Vercel Cron calls:

```text
GET /api/cron/sync-google-calendar
```

The schedule is daily in `vercel.json` because Vercel Hobby allows daily cron jobs. Upgrade to Pro before changing it to hourly or more frequent sync. Add `CRON_SECRET` in Vercel so scheduled calls are authorized and direct/manual calls are rejected unless they include the same bearer token.

## Supabase Auth Redirect URLs

After deployment, copy the deployed URL and add it in Supabase:

Supabase Dashboard > Authentication > URL Configuration

Set:

```text
Site URL: https://your-deployed-url
```

Add redirect URLs:

```text
http://localhost:5173/
https://your-deployed-url/
```

When the custom subdomain is ready, add:

```text
https://your-subdomain.yourdomain.com/
```

Magic links are generated against the app root URL. If you change these Supabase settings, request a fresh magic link because old links keep their original redirect target.

## First Production Test

1. Deploy the app.
2. Open the deployed URL.
3. Go to Settings.
4. Sign in with magic link.
5. Confirm sync status becomes `synced`.
6. Add a task.
7. Refresh or open another browser.
8. Confirm the task auto-downloads after sign-in.

## Notes

- `vercel.json` handles React Router refreshes on Vercel.
- `public/_redirects` handles React Router refreshes on Netlify.
- The app still keeps LocalStorage as an offline/local fallback.
