# Align

A clean React + TypeScript project management app inspired by lightweight tools like ClickUp, Notion, Todoist, and Linear. It starts as a web app and keeps the code compatible with a future Electron or Tauri wrapper.

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

The integration layer is prepared in:

```text
src/integrations/googleCalendar/
```

Add OAuth credentials, token exchange, and Google Calendar API calls inside `googleCalendarClient.ts`. The Settings page already includes a “Connect Google Calendar” placeholder.

Recommended next implementation path:

1. Create a Google Cloud project and OAuth client.
2. Add allowed redirect URLs for local development and the production subdomain.
3. Move calendar auth/token exchange behind a small backend endpoint so client secrets never ship in the browser.
4. Store user Google tokens in the hosted database, encrypted or protected by the backend provider.
5. Use `sync.ts` to map local tasks/events to Google Calendar events.

## Hosted Sync Path

LocalStorage is great for this MVP, but it only works on one device. To use the app from a subdomain, tablet, and another laptop, add:

- Hosting for the Vite app, for example Vercel, Netlify, Cloudflare Pages, or a VPS.
- A backend/database, for example Supabase, Firebase, Appwrite, or a custom Node API.
- Auth so each user can securely load their own workspace.
- A migration layer that replaces the Zustand LocalStorage persistence with API calls while keeping the existing stores as the UI-facing state boundary.

The current architecture is ready for this because UI, stores, types, and integration code are separated.

### Supabase Setup

Supabase sync scaffolding is already included. You can use it before the subdomain is ready.

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Run `supabase/schema.sql`.
4. Copy `.env.example` to `.env.local`.
5. Add your Supabase project URL and anon key:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

6. Restart the Vite dev server.
7. Go to Settings > Supabase Sync.
8. Send yourself a magic link and sign in.
9. Use “Upload Local Data” once to seed the cloud workspace.

When your subdomain is ready, add it to Supabase Auth > URL Configuration as an allowed redirect URL.

## Desktop App Path

Because this is a normal Vite web app, it can later be wrapped with Tauri or Electron:

- Tauri: point the Tauri frontend dev/build settings at Vite.
- Electron: load the Vite dev server in development and the built `dist/` folder in production.

Keep filesystem, notifications, and OS-specific APIs behind service modules so the React UI stays portable.

## Roadmap

- Project task boards and richer statuses
- Real auth and database sync
- Google Calendar OAuth and two-way sync
- Desktop packaging with Tauri or Electron
- Project boards, reminders, and keyboard shortcuts
