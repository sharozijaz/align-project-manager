# Align Google Calendar Integration

## Current State

Align has the frontend integration layer and Settings readiness panel in place, but it does not complete OAuth yet.

This is intentional: Google OAuth token exchange and refresh token storage should happen in a backend or serverless function, not inside the browser bundle.

## Scope

Use the narrow Calendar API scope:

```text
https://www.googleapis.com/auth/calendar.events.owned
```

This is intended for events on calendars the signed-in Google user owns.

## Required Environment Variables

```bash
APP_URL=https://your-domain.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary
CRON_SECRET=generate-a-long-random-secret
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-calendar/callback
VITE_GOOGLE_CALENDAR_ID=primary
```

Do not add Google client secrets or Supabase service role keys to Vite variables. Any `VITE_` value is visible in the browser.

## Supabase Table

Run:

```text
supabase/google-calendar.sql
```

This creates server-only token storage in `public.google_calendar_connections`.

## Backend Flow

Implemented endpoints:

- `POST /api/google-calendar/connect`
- `GET /api/google-calendar/callback`
- `GET /api/google-calendar/status`
- `GET /api/google-calendar/events`
- `POST /api/google-calendar/sync`
- `POST /api/google-calendar/disconnect`

Implemented behavior:

- fetch Google events
- create events from Align tasks
- update events when tasks change
- revoke/disconnect Google Calendar
- prevent duplicate task events with `public.google_calendar_task_links`
- auto-sync task changes after a short delay
- show recent sync history in Settings
- skip overwriting linked Google events that were edited after the last Align sync
- resolve conflicts by keeping Google or overwriting with Align
- background scheduled sync through `GET /api/cron/sync-google-calendar`

Still to add:

- reminder notifications using the same cron foundation

## Frontend Files

- `src/integrations/googleCalendar/googleCalendarClient.ts`
- `src/integrations/googleCalendar/sync.ts`
- `src/integrations/googleCalendar/types.ts`
- `src/pages/Settings.tsx`

## Background Sync

`vercel.json` schedules `/api/cron/sync-google-calendar` daily. The endpoint reads every saved Google Calendar connection, downloads that user's tasks from Supabase, refreshes Google tokens when needed, and syncs dated active tasks.

Vercel Hobby allows daily cron jobs. Upgrade to Pro before changing this to hourly or more frequent sync.

Set `CRON_SECRET` in Vercel. Vercel sends it as `Authorization: Bearer <CRON_SECRET>` for scheduled calls, and the endpoint rejects manual calls with the wrong token.
