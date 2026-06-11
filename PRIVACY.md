# Privacy

Align is designed to be local-first.

The public project covers the web and Windows desktop app. The Android companion app is personal/private only and is not part of the public repository or public release distribution.

## Local-Only Mode

If Supabase and hosted API environment variables are not configured, Align stores workspace data in the local browser or desktop WebView storage on your device.

Local-only data can include:

- projects
- tasks and todos
- calendar events
- notes and resources
- app preferences

Local-only data is not sent to the maintainer's server.

## Optional Cloud Sync

If you configure Supabase, Align can sync workspace data to your Supabase project. In that mode, Supabase Auth identifies the user and Supabase Row Level Security should isolate each user's rows.

Open-source users should configure their own Supabase project if they want cloud sync. The maintainer's private hosted backend is not intended for public users.

## Optional Google Sync

Google Calendar and Google Todo sync require a hosted API and Google OAuth configuration. When enabled, Align stores Google connection metadata and tokens in the configured backend so it can sync tasks with Google services.

Google sync should only be enabled when you understand and control the configured backend.

Hosted API code encrypts saved Google access and refresh tokens with `GOOGLE_TOKEN_ENCRYPTION_KEY`. If that key is lost, reconnect Google instead of trying to recover old encrypted tokens.

## Optional Share Links

Client share links require hosted API routes. Shared pages are read-only and should expose only selected project data and client-visible notes.

Notes remain private by default. A note only appears on a share link when it is linked to a shared project and explicitly marked client-visible. Resources are not exposed by share links.

New share links are password-protected and expire by default. Review or disable older links that were created before password/expiry defaults.

## Backups

Align supports export/import workflows. Backup files are controlled by the user. Treat backup files as private because they can contain project details, notes, links, and client context.

Before manual cloud download, import, or sign-out cleanup, Align saves a local safety snapshot on the same device. If Supabase is down, slow, errors, or unexpectedly returns an empty existing workspace, Align should keep the local workspace visible and warn that local data is safe.

For disaster recovery, restore from your latest JSON backup first, confirm the local workspace is correct, then reconnect or upload to Supabase.

## Secrets

Never put server-only secrets in frontend environment variables or desktop builds. This includes Supabase service-role keys, Google client secrets, Resend API keys, cron secrets, database passwords, OAuth refresh tokens, and private keys.
