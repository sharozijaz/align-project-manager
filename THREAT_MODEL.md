# Align Threat Model

Updated detailed threat model: `align-app-code-threat-model.md`.

Last updated: 2026-06-05 after the public-repo secret and Android hardening audit.

## Scope

This model covers the public Align repository: the Vite/React frontend in `src/`, Tauri desktop shell in `src-tauri/`, Vercel-style API routes in `api/`, Supabase SQL in `supabase/`, and release/docs tooling.

Align has two intended release modes:

- Public local-first mode: no maintainer backend configured; data stays in browser or desktop WebView storage unless the user imports/exports backups.
- Private or self-hosted cloud mode: Supabase Auth/database, hosted `/api/*` routes, Google sync, email reminders, and share links are explicitly configured by the operator.

## Assets

- Workspace data: projects, tasks, todos, calendar events, notes, resources, reminders, and preferences.
- Private notes/resources in Personal Hub.
- Share-link tokens and share passwords.
- Supabase session tokens and per-user cloud rows.
- Server-only secrets: Supabase service role key, Google client secret, Google token encryption key, Resend key, cron secret.
- Google access and refresh tokens stored for Calendar/Todo sync.
- Desktop installer artifacts and update/release metadata.

## Entry Points

- Browser/desktop app routes in `src/app/App.tsx`.
- Supabase client reads/writes in `src/integrations/supabase/*`.
- Hosted API routes in `api/google-calendar/*`, `api/google-sync.js`, `api/google-todos.js`, `api/reminders/check.js`, `api/project-share.js`, `api/client-share.js`, and `api/cron/sync-google-calendar.js`.
- Public share-link APIs for read-only client views.
- Backup import/export flows in Settings and Personal Hub.
- Markdown/template files intended for public distribution.

## Trust Boundaries

- Local app storage to optional Supabase cloud sync.
- Frontend session token to hosted API authorization.
- Hosted API service-role calls to Supabase tables.
- Hosted API Google OAuth/token calls to Google APIs.
- Public unauthenticated share links to selected read-only project data.
- User-provided backup/template JSON to app state import.
- Local desktop app to operating system notifications, tray behavior, and external link opening.

## Key Threats

### Cross-User Cloud Data Access

Impact: high. A signed-in user could try to call hosted APIs or Supabase rows belonging to another user.

Existing controls: Supabase RLS policies scope rows to `auth.uid()`. Hosted APIs now call `requireAllowedUser` for signed-in routes and use service-role queries only after a valid Supabase session and allowlist pass.

Remaining work: keep `public.allowed_users` current and confirm policies are applied after every schema reset.

### Public Build Uses Maintainer Backend

Impact: high. A public desktop build silently pointing at a private backend could leak user data or create unexpected cost.

Existing controls: public release env guard fails when cloud frontend env keys or server-only secrets are present unless explicitly overridden.

Remaining work: run the guard before every public release and keep public releases local-first.

### Google Token Theft

Impact: high. Google tokens can access Calendar/Tasks scopes.

Existing controls: Google tokens are encrypted before storage with `GOOGLE_TOKEN_ENCRYPTION_KEY`; plaintext legacy tokens remain readable only for migration and are rewritten encrypted on reconnect/refresh.

Remaining work: rotate/reconnect Google if the encryption key is exposed or lost.

### Share Link Overexposure

Impact: medium to high. A public share link could expose private notes or remain valid too long.

Existing controls: share APIs return only selected project/task data; Hub resources are not returned; Hub notes require explicit `client_visible`; new links are password-protected and expire by default. Client overview project-detail links inherit the overview password and expiry.

Remaining work: review older links and disable links created before password/expiry defaults.

### API Abuse And DDoS

Impact: medium. Serverless routes can be abused for cost, quota, and availability pressure.

Existing controls: in-app rate limits, payload size checks, JSON checks, strict CORS, cron bearer secret, and share password attempt limits.

Remaining work: deploy production behind Cloudflare WAF or equivalent edge rate limiting; keep cron schedules conservative.

### Backup/Template Import Abuse

Impact: medium. Malformed or oversized backups/templates could corrupt local state or degrade performance.

Existing controls: import flows use structured JSON and local safety snapshots before risky operations.

Remaining work: keep schema validation tight for new importable template formats and require user confirmation before destructive imports.

### Supabase Outage Or Empty Cloud Response

Impact: medium. A cloud outage or unexpected empty workspace could wipe local data if blindly applied.

Existing controls: local workspace is treated as active copy; sync keeps local data on cloud errors or unexpected empty workspace; manual safety backups are created before risky operations.

Remaining work: encourage regular JSON exports and document restore-first recovery.

## Security Assumptions

- Public users self-host cloud services if they want sync.
- Maintainer-hosted backend is private or allowlisted.
- Server-only secrets are set only on the API host, never in frontend/desktop builds.
- Users treat JSON backups as private files.

## Highest Priority Controls

1. Keep public builds local-first by default.
2. Enforce allowed users and RLS on hosted deployments.
3. Keep Google tokens encrypted and server-only.
4. Keep share links passworded, expiring, and client-visible only.
5. Run release scans before publishing code, docs, or installers.
