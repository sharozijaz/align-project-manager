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

Still to add:

- automatic background sync cadence
- richer conflict handling if the Google event was manually edited

## Frontend Files

- `src/integrations/googleCalendar/googleCalendarClient.ts`
- `src/integrations/googleCalendar/sync.ts`
- `src/integrations/googleCalendar/types.ts`
- `src/pages/Settings.tsx`

## Next Implementation Step

Add Vercel serverless functions under `api/google-calendar/*`, then connect the existing frontend `connectGoogleCalendar`, `fetchGoogleEvents`, `syncTaskToGoogleCalendar`, and `disconnectGoogleCalendar` functions to those endpoints.
