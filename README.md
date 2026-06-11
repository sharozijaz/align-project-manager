# Align

Align is a local-first project and life planning app for freelance web designers and developers. It brings projects, tasks, todos, calendar planning, notes, reminders, reports, and client handoff into one focused workspace.

The public open-source app is designed to work without a hosted backend. Supabase sync, Google sync, email reminders, and share links are optional cloud features for users who configure their own backend.

The Android companion app is personal/private only. Do not commit, publish, or include `android-app/` in the public GitHub repository or public release artifacts.

## Status

Align is past the alpha/beta stage for personal daily use, but the public open-source release is being prepared in phases. See `ROADMAP.md`.

## Core Features

- Projects with tasks, subtasks, card/table/board/kanban views, and client context.
- Personal todos and task planning across day, week, and month.
- Calendar with Month, Week, and Agenda views.
- Notes and Resources as separate private workspaces.
- Reports for progress, overdue work, status mix, and upcoming deadlines.
- Local desktop notifications and Tauri desktop packaging.
- Optional Supabase sync, Google Calendar/Todo sync, client share links, and email reminders for configured hosted deployments.

## Local-First Usage

Install dependencies:

```bash
npm install
```

Run the web app locally:

```bash
npm run dev
```

Build the web app:

```bash
npm run build
```

Run the desktop app in development:

```bash
npm run desktop:dev
```

Build the Windows desktop app:

```bash
npm run desktop:build
```

When no Supabase environment variables are configured, Align stores data locally in browser or desktop WebView storage.

Fresh installs start with a blank workspace. Import a backup or template pack if you want starter content.

### Sync Modes

Align has three workspace sync modes in Settings > Data:

- `Local only`: keep data on this device and block Supabase upload/download. Use this for the lowest-cost public/open-source setup.
- `Paused`: stay signed in, but use manual upload/download only. Use this before testing a new backend or switching devices.
- `Cloud sync`: automatically download and upload workspace changes when signed in. Use this only with your own configured Supabase project or trusted hosted deployment.

Export a full workspace backup before switching modes on an important workspace.

If Supabase is unavailable or returns an unexpected empty existing workspace, Align keeps the local workspace visible and warns that local data is safe on this device. Restore from a JSON backup first, then reconnect cloud sync.

## Optional Cloud Setup

Cloud features are optional. Public users should configure their own Supabase/Vercel/Google/email services if they want hosted sync or integrations. The maintainer's private hosted deployment is not intended for public app users.

Frontend-safe environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ALLOWED_EMAILS=
VITE_AUTH_METHOD=google
VITE_APP_URL=
VITE_PUBLIC_APP_URL=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_REDIRECT_URI=
VITE_GOOGLE_CALENDAR_ID=primary
```

Server-only environment variables:

```bash
APP_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ALLOWED_API_ORIGINS=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_CALENDAR_ID=primary
GOOGLE_TOKEN_ENCRYPTION_KEY=
CRON_SECRET=
RESEND_API_KEY=
REMINDER_EMAIL_FROM=
REMINDER_EMAIL_REPLY_TO=
```

Never commit `.env.local`, Supabase service-role keys, Google client secrets, Resend keys, cron secrets, OAuth refresh tokens, database passwords, or private keys.

## Supabase Setup

For a fresh self-hosted Supabase project:

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Run the feature migration files needed for your deployment:

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
supabase/share-link-schema-repair.sql
supabase/personal-hub.sql
supabase/hub-notes-project-links.sql
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

5. Insert allowed users if your deployment uses allowlisting:

```sql
insert into public.allowed_users (email)
values ('your-email@example.com')
on conflict (email) do nothing;
```

6. Add your Supabase URL and anon key to `.env.local`.
7. Restart the dev server or rebuild the desktop app.

If Supabase reports a schema-cache error after a migration, run:

```sql
notify pgrst, 'reload schema';
```

## Google And Hosted APIs

Google Calendar/Todo sync, email reminders, and public share links require hosted API routes and server-side secrets. They should not run from frontend-only or desktop-only builds unless `VITE_APP_URL` or `VITE_PUBLIC_APP_URL` points to a deployment that owns those routes.

Private hosted deployments should use Google-only auth (`VITE_AUTH_METHOD=google`), run `supabase/security-hardening.sql`, add trusted emails to `public.allowed_users`, set `ALLOWED_API_ORIGINS`, and set `GOOGLE_TOKEN_ENCRYPTION_KEY` before enabling Google sync. Public open-source builds should stay local-first unless the user self-hosts these services.

Google sign-in setup notes live in `GOOGLE_SIGN_IN.md`.
Google Calendar setup notes live in `GOOGLE_CALENDAR.md`.
Deployment notes live in `DEPLOYMENT.md`.
Complete self-hosting notes live in `SELF_HOSTING.md`.
Short self-hosting checklist lives in `SELF_HOSTING_CHECKLIST.md`.

## Desktop App

Align uses Tauri for the Windows desktop build.

Desktop notes live in `DESKTOP.md`.
Owner maintenance and update steps live in `MAINTENANCE.md`.

After a cleanup or Windows reinstall, `node_modules/`, `dist/`, and `src-tauri/target/` may be missing. That is expected. Run `npm install` before building again.

Android builds are not part of the public source release. Keep the Android project, signing material, APKs, AABs, and mobile release notes private.

## Project Structure

```text
src/
  app/                 App shell and router
  components/          Reusable layout, UI, dashboard, task, project, calendar components
  features/            Feature access and app-level behavior
  integrations/        Supabase, Google, desktop, and hosted service clients
  pages/               Route-level pages
  store/               Zustand stores and local workspace state
  styles/              Tailwind globals
  types/               Shared TypeScript models
  utils/               Date, storage, sharing, and helper utilities
```

## Checks

```bash
npm run check:unused
npm run check:ts-unused
npm audit --audit-level=moderate
npm run build
```

Or run the combined release check:

```bash
npm run check:release
```

Before a desktop release:

```bash
npm run release:desktop
```

## Documentation

- `ROADMAP.md` - production and open-source roadmap.
- `PRIVACY.md` - local-first privacy model and optional cloud behavior.
- `SECURITY.md` - security rules and manual checks.
- `THREAT_MODEL.md` - repository-grounded threat model.
- `SECURITY_AUDIT.md` - current hardening audit and remaining risks.
- `SELF_HOSTING.md` - bring-your-own-backend setup and cost-control guide.
- `SELF_HOSTING_CHECKLIST.md` - short self-hosting checklist.
- `CONTRIBUTING.md` - contribution and development rules.
- `RELEASE.md` - GitHub release pipeline and desktop installer checklist.
- `TEMPLATES.md` - free and paid workflow template pack model.
- `BUSINESS_MODEL.md` - monetization path for templates, customization, and future cloud services.
- `CHANGELOG.md` - release notes.
- `DESKTOP.md` - Tauri desktop setup and release notes.
- `DEPLOYMENT.md` - hosted deployment notes.
- `MAINTENANCE.md` - owner maintenance checklist.

## License

Align is licensed under the MIT License. See `LICENSE`.
