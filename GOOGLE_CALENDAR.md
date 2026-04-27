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
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
VITE_GOOGLE_REDIRECT_URI=https://your-domain.com/api/google-calendar/callback
VITE_GOOGLE_CALENDAR_ID=primary
```

Do not add Google client secrets to Vite variables. Any `VITE_` value is visible in the browser.

## Recommended Backend Flow

1. Create a Google Cloud OAuth client.
2. Add the deployed callback URL as an authorized redirect URI.
3. Add a serverless callback route, for example `/api/google-calendar/callback`.
4. Exchange the Google authorization code on the server.
5. Store encrypted refresh tokens by Supabase user ID.
6. Use serverless endpoints to:
   - fetch Google events
   - create events from Align tasks
   - update events when tasks change
   - revoke/disconnect Google Calendar

## Frontend Files

- `src/integrations/googleCalendar/googleCalendarClient.ts`
- `src/integrations/googleCalendar/sync.ts`
- `src/integrations/googleCalendar/types.ts`
- `src/pages/Settings.tsx`

## Next Implementation Step

Add Vercel serverless functions under `api/google-calendar/*`, then connect the existing frontend `connectGoogleCalendar`, `fetchGoogleEvents`, `syncTaskToGoogleCalendar`, and `disconnectGoogleCalendar` functions to those endpoints.
