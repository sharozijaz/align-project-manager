# Privacy

Align is designed to be local-first.

## Local-Only Mode

If Supabase and hosted API environment variables are not configured, Align stores workspace data in the local browser or desktop WebView storage on your device.

Local-only data can include:

- projects
- tasks and todos
- calendar events
- Personal Hub notes and resources
- app preferences

Local-only data is not sent to the maintainer's server.

## Optional Cloud Sync

If you configure Supabase, Align can sync workspace data to your Supabase project. In that mode, Supabase Auth identifies the user and Supabase Row Level Security should isolate each user's rows.

Open-source users should configure their own Supabase project if they want cloud sync. The maintainer's private hosted backend is not intended for public users.

## Optional Google Sync

Google Calendar and Google Todo sync require a hosted API and Google OAuth configuration. When enabled, Align stores Google connection metadata and tokens in the configured backend so it can sync tasks with Google services.

Google sync should only be enabled when you understand and control the configured backend.

## Optional Share Links

Client share links require hosted API routes. Shared pages are read-only and should expose only selected project data and client-visible notes.

Personal Hub notes should remain private unless intentionally linked and exposed through a share workflow.

## Backups

Align supports export/import workflows. Backup files are controlled by the user. Treat backup files as private because they can contain project details, notes, links, and client context.

## Secrets

Never put server-only secrets in frontend environment variables or desktop builds. This includes Supabase service-role keys, Google client secrets, Resend API keys, cron secrets, database passwords, OAuth refresh tokens, and private keys.
