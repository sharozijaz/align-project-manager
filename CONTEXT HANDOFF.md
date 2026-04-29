# Context Handoff

## Architecture Decisions Made

- Built a modular React + TypeScript app using Vite.
- Styling uses Tailwind CSS with custom global font setup.
- Routing uses React Router with route-level pages under `src/pages`.
- State is separated from UI with Zustand stores.
- Persistence is LocalStorage-first via Zustand `persist`.
- Supabase sync scaffolding has been added, but LocalStorage remains the active offline/local fallback.
- The app is now dark-theme only. Light/theme switching was removed after both themes became visually inconsistent.
- Dashboard keeps the dark visual hero/header direction from the supplied mockup.
- Calendar is a custom monthly calendar component rather than FullCalendar.
- Google Calendar is not implemented yet; only a placeholder integration layer exists.
- Desktop packaging is not implemented, but code is kept web-first and suitable for future Tauri/Electron wrapping.

## Files Created/Modified

### Root/config

- `package.json`
- `package-lock.json`
- `index.html`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `README.md`
- `CONTEXT HANDOFF.md`

### App/routing

- `src/main.tsx`
- `src/app/App.tsx`
- `src/app/router.tsx`

### Styles/assets

- `src/styles/globals.css`
- `public/hero-texture.svg`

### Types

- `src/types/task.ts`
- `src/types/project.ts`
- `src/types/calendar.ts`

### Stores

- `src/store/taskStore.ts`
- `src/store/projectStore.ts`
- `src/store/calendarStore.ts`
- `src/store/demoData.ts`

Deleted:

- `src/store/settingsStore.ts`

### Utilities

- `src/utils/date.ts`
- `src/utils/storage.ts`
- `src/utils/taskVisuals.ts`

### Layout components

- `src/components/layout/Navbar.tsx`
- `src/components/layout/PageHeader.tsx`

Deleted:

- `src/components/layout/Sidebar.tsx`

### UI components

- `src/components/ui/Button.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Select.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Modal.tsx`

### Dashboard components

- `src/components/dashboard/Hero.tsx`
- `src/components/dashboard/Glance.tsx`
- `src/components/dashboard/QuickAddTask.tsx`
- `src/components/dashboard/StatsCards.tsx`
- `src/components/dashboard/TodayTasks.tsx`
- `src/components/dashboard/UpcomingTasks.tsx`
- `src/components/dashboard/ActiveProjects.tsx`

### Task components

- `src/components/tasks/TaskCard.tsx`
- `src/components/tasks/DeletedTaskToast.tsx`
- `src/components/tasks/TaskList.tsx`
- `src/components/tasks/TaskForm.tsx`
- `src/components/tasks/TaskFilters.tsx`

### Project components

- `src/components/projects/ProjectCard.tsx`
- `src/components/projects/ProjectForm.tsx`
- `src/components/projects/ProjectDetail.tsx`

### Calendar components

- `src/components/calendar/CalendarView.tsx`
- `src/components/calendar/CalendarEventModal.tsx`

### Pages

- `src/pages/Dashboard.tsx`
- `src/pages/Projects.tsx`
- `src/pages/ProjectDetails.tsx`
- `src/pages/Tasks.tsx`
- `src/pages/Calendar.tsx`
- `src/pages/Settings.tsx`

### Integrations

- `src/integrations/googleCalendar/types.ts`
- `src/integrations/googleCalendar/googleCalendarClient.ts`
- `src/integrations/googleCalendar/sync.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/integrations/supabase/mappers.ts`
- `src/integrations/supabase/workspaceSync.ts`
- `src/integrations/supabase/useSupabaseSession.ts`

### Supabase

- `supabase/schema.sql`
- `.env.example`

## Data Models

### Task

```ts
Task {
  id: string
  title: string
  description?: string
  projectId?: string
  category: "personal" | "work" | "project" | "meeting" | "chore"
  priority: "low" | "medium" | "high" | "urgent"
  status: "not-started" | "in-progress" | "completed"
  dueDate?: string
  deletedAt?: string
  createdAt: string
  updatedAt: string
}
```

### Project

```ts
Project {
  id: string
  name: string
  description?: string
  status: "active" | "paused" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  dueDate?: string
  createdAt: string
  updatedAt: string
}
```

### CalendarEvent

```ts
CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string
  endDate?: string
  linkedTaskId?: string
  source: "local" | "google"
}
```

## Features Completed

- Dashboard with dark hero area and live glance section.
- Live glance includes:
  - current time updated every second
  - current date
  - weather fetched from Open-Meteo
  - geolocation when available
  - fallback coordinates when permission is denied
- Global top navbar across all pages.
- Removed left sidebar and duplicate nav.
- Dark-only app shell.
- Dashboard quick-add task form.
- Quick-add includes title, project/category, priority, status, due date, and add button.
- Summary cards:
  - Open Tasks
  - Due Today
  - Overdue
- Dashboard sections:
  - Today’s Tasks
  - Upcoming Deadlines
  - Active Projects moved to bottom/full-width
- Task CRUD:
  - add
  - edit
  - soft delete
  - mark completed
- Immediate undo toast after task delete.
- Deleted Tasks bin in Settings with restore and permanent delete.
- Confirmation prompts for project delete, local calendar event delete, backup import overwrite, and permanent task delete.
- Project CRUD:
  - create
  - edit
  - delete
- Assign tasks to projects.
- Project cards show:
  - total task count
  - open task count
  - completed task count
- Project detail page with:
  - progress indicator
  - project task list
  - add task to project
  - status/priority filters
- Global tasks page with:
  - search
  - filters: all, today, upcoming, overdue, completed
  - sorting by due date, priority, status
- Calendar page with:
  - monthly grid
  - tasks by due date
  - local calendar events
  - date selection side panel
  - add local event modal
  - edit local event
  - delete local event
- Settings page with profile, dark theme status, Google Calendar placeholder, real JSON export/import, Supabase sync controls, and Deleted Tasks recovery.
- Priority and deadline visual coding:
  - urgent: purple
  - high: orange/yellow
  - medium: amber
  - low: green
  - overdue: red
- Fonts changed to:
  - Space Grotesk for headings
  - Jost for body/UI
- Dark-only reusable UI primitives were tightened for stronger contrast.
- `npm run build` passes after the latest dark-only/recovery/export changes.

## Bugs/Issues Remaining

- Dark visual polish is improved through shared primitives, but browser testing is still recommended for page-by-page polish.
- Calendar dark mode now has explicit selected/today states and readable task/event chips.
- Native date input display depends on browser styling; dark calendar icon was patched for WebKit, but cross-browser behavior should be tested.
- Weather fetch requires network and may fail silently if the API is unreachable.
- Weather fallback coordinates are fixed and not user-configurable.
- No automated tests are currently added.
- No lint script is currently configured.
- Supabase client/schema/sync services exist, but a Supabase project and `.env.local` values are still needed before cloud sync works.
- Google Calendar OAuth/sync is only a stub.
- Export/import is implemented for the current LocalStorage-backed workspace, but it does not yet support schema migrations.
- The old HTML/CSS/JS app remains only as reference in the original external folder; it was not migrated directly.

## Next Priorities

1. Do a dark-only UI contrast pass page by page:
   - Dashboard
   - Projects
   - Tasks
   - Calendar
   - Settings
   - Modals/forms
2. Normalize reusable surface styles:
   - cards
   - empty states
   - list rows
   - buttons
   - inputs/selects
   - badges
3. Make calendar dark mode feel intentional:
   - reduce white cells
   - improve today/selected state
   - show event/task chips inside dates
4. Add a full task creation modal or expandable advanced fields for quick-add.
5. Add edit/delete for calendar events.
6. Create the Supabase project, run `supabase/schema.sql`, add `.env.local`, and test magic-link sign-in.
7. Upload local data once, then test download on another browser/device.
8. Add Google Calendar OAuth through backend-managed credentials.
9. Add tests for stores and date/task filtering utilities.
10. Add richer calendar recurrence/reminders after sync is stable.
11. Prepare optional Tauri/Electron wrapper after hosted MVP stabilizes.

## Constraints We Agreed On

- Do not build the app in one file.
- Keep project modular and scalable.
- Use React + TypeScript + Vite.
- Use Tailwind CSS.
- Use React Router.
- Use Zustand or Context API; Zustand was chosen.
- Use LocalStorage first for persistence.
- Keep database/auth integration possible later.
- Use date-fns for date logic.
- Do not fully implement Google Calendar OAuth now.
- Provide a clean Google Calendar integration layer for later.
- Build web app first; desktop packaging comes later.
- Keep UI premium, minimal, clean, and responsive.
- Avoid copying the old plain HTML/CSS/JS app structure.
- Use reusable components.
- No side navbar.
- One global top navbar only.
- Light/dark theme support is active, with dark as the calmer default.
- Dashboard should keep the dark hero/header direction with the live glance section.

## Remaining Product Roadmap

### Current Product State

- Align is now an MVP-plus project management app, not just a prototype.
- Supabase sync works while the app is open.
- Google Calendar sync works while the app is open.
- Security gating is in place with approved-email access.
- Custom domain is connected and working.
- Core app areas are complete:
  - dashboard
  - projects
  - project details
  - tasks
  - calendar
  - settings
- Product polish already completed:
  - Align branding/logo
  - light/dark theme support
  - cleaned top navbar
  - settings moved under profile menu
  - task card/table view
  - deleted task recovery
  - expanded priority/status options
  - Supabase hosted sync
  - Google Calendar connection and manual sync

### Background Sync And Reminders Status

- Background Google Calendar sync is implemented through Vercel Cron at `/api/cron/sync-google-calendar`.
- On Vercel Hobby, the cron schedule is daily and uses UTC.
- Task reminder preferences are being added as fixed built-in options:
  - no reminder
  - due date
  - 1 day before
  - 2 days before
  - 1 week before
- In-app notification records are generated by the cron route from task reminder preferences.
- Before deploying reminder notifications, run `supabase/reminders.sql` in Supabase SQL Editor.
- Email reminders are still a future layer and should use the same notifications table.

### Next Product Priorities

1. Finish/verify in-app reminders in production.
2. Email notifications.
3. PWA/mobile polish.
4. Read-only client project share links.
5. Recurring tasks.
6. Better reports.
7. Browser/mobile push notifications later.

### Feature Notes To Preserve

- Notifications should start with in-app + email because they are reliable and lower complexity. Browser/mobile push can come later.
- Reminders are essential. Reliable reminders require server cron if Align is closed.
- Client collaboration should start with read-only project share links. Client editing, comments, approvals, and uploads are later upgrades.
- Recurring tasks are for repeated routines like weekly client updates, monthly invoices, maintenance checks, and recurring client operations.
- Reports should focus first on completed work, overdue work, project progress, upcoming deadlines, and client/monthly summaries.
- Mobile should be handled as a responsive PWA first. Do not build native mobile first. The goal is to install/use Align from phone, tablet, and laptop through the same domain.

### Next Implementation Default

- If future context is lost, resume with the reminder notification QA first.
- Recommended first implementation:
  - Run `supabase/reminders.sql` if it has not been run yet.
  - Deploy the reminder UI/cron changes.
  - Test one dated task with a due-date reminder.
  - Add email delivery through a provider such as Resend, Postmark, or SendGrid.
  - Keep browser/mobile push notifications out of v1.
