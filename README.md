# Align

A focused React + TypeScript project management app for solo/freelance work, client projects, reminders, Google Calendar sync, and read-only client sharing. The production app is deployed at `https://align.sharoz.dev`.

## Tech Stack

- React + TypeScript
- Vite
- Tailwind CSS
- React Router
- Zustand with LocalStorage persistence
- date-fns
- Custom monthly calendar view

## Setup

```bash
npm install
npm run dev
```

Build for production:

```bash
npm run build
```

Deployment notes live in `DEPLOYMENT.md`.
Security notes live in `SECURITY.md`.

## Production Setup

Align is hosted on Vercel with Supabase, Google Calendar, and Resend.

Required Vercel environment variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_APP_URL=https://align.sharoz.dev
VITE_ALLOWED_EMAILS=
APP_URL=https://align.sharoz.dev
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://align.sharoz.dev/api/google-calendar/callback
GOOGLE_CALENDAR_ID=primary
RESEND_API_KEY=
REMINDER_EMAIL_FROM=
REMINDER_EMAIL_REPLY_TO=
```

Never commit `.env.local`, Supabase service-role keys, Google client secrets, Resend keys, or database passwords.

## Project Structure

```text
src/
  app/                 App shell and router
  components/          Reusable layout, UI, dashboard, task, project, calendar components
  integrations/        Future external service clients
  pages/               Route-level pages
  store/               Zustand stores and demo seed data
  styles/              Tailwind globals
  types/               Shared TypeScript models
  utils/               Date and storage helpers
```

## State Model

Tasks, projects, and calendar events are stored in separate Zustand stores:

- `src/store/taskStore.ts`
- `src/store/projectStore.ts`
- `src/store/calendarStore.ts`

Each store persists to LocalStorage, so the MVP works without a backend. Later, these stores can call API services instead of writing directly to browser storage.

Deleted tasks are soft-deleted first. They can be restored immediately from the undo toast or later from Settings > Deleted Tasks. Settings also includes real JSON export/import for LocalStorage-backed workspace data.

## Google Calendar

Google Calendar OAuth and sync are implemented through Vercel API routes and Supabase-backed token storage. The cron route also supports background sync:

```text
/api/cron/sync-google-calendar
```

Vercel Cron should call this route with `CRON_SECRET`.

## Hosted Sync Path

LocalStorage is great for this MVP, but it only works on one device. To use the app from a subdomain, tablet, and another laptop, add:

- Hosting for the Vite app, for example Vercel, Netlify, Cloudflare Pages, or a VPS.
- A backend/database, for example Supabase, Firebase, Appwrite, or a custom Node API.
- Auth so each user can securely load their own workspace.
- A migration layer that replaces the Zustand LocalStorage persistence with API calls while keeping the existing stores as the UI-facing state boundary.

The current architecture is ready for this because UI, stores, types, and integration code are separated.

### Supabase Setup

For a fresh Supabase project:

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Run the migration files needed by the current app features:

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
```

5. Insert allowed users:

```sql
insert into public.allowed_users (email)
values ('your-email@example.com')
on conflict (email) do nothing;
```

6. Copy `.env.example` to `.env.local` for local development.
7. Add your Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

8. Restart the Vite dev server.
9. Sign in with the approved email.
10. Use Settings sync controls if you need to upload/download a workspace manually.

If Supabase reports a schema-cache error after a migration, run:

```sql
notify pgrst, 'reload schema';
```

## Desktop App Path

Because this is a normal Vite web app, it can later be wrapped with Tauri or Electron:

- Tauri: point the Tauri frontend dev/build settings at Vite.
- Electron: load the Vite dev server in development and the built `dist/` folder in production.

Keep filesystem, notifications, and OS-specific APIs behind service modules so the React UI stays portable.

## Roadmap

- Browser/mobile push notifications, if email reminders are not enough later
- Optional desktop packaging with Tauri or Electron
- Optional client collaboration upgrades: comments, approvals, uploads
- Optional advanced reports: monthly/client summaries, PDFs, time spent
