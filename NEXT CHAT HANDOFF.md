# Align Next Chat Handoff

Use this file as the starting context for the next chat. The previous thread became very long and compacted multiple times, so the safest path is to treat this as the source of truth and avoid replaying old implementation loops.

## Verified Handoff Check - May 6, 2026

This file was re-checked after the context reset so the next chat can start cleanly.

Current repo status at the time of this check:

- Modified: `src/components/notifications/DesktopNotificationBridge.tsx`
- Modified: `src/integrations/desktop/notifications.ts`
- Modified: `src/pages/Settings.tsx`
- Modified: `src-tauri/src/lib.rs`
- Untracked: `NEXT CHAT HANDOFF.md`

Verification run after the reset:

```powershell
npm run build
cargo check
git diff --check
```

Results:

- `npm run build`: passed
- `cargo check` in `src-tauri`: passed
- `git diff --check`: passed with only expected line-ending warnings

Important: the next chat should still begin with `git status --short`, because files may change after this handoff. Do not commit, push, or revert anything until the user confirms.

## Current Product State

Align is a working project management and personal studio app.

Core app is built with:

- React + TypeScript + Vite
- Zustand stores
- Supabase for hosted data/sync
- Google Calendar integration
- Tauri desktop packaging
- Vercel deployment
- Custom domain: `https://align.sharoz.dev`

The app is no longer just an MVP. It has:

- Dashboard
- Projects
- Project details
- Tasks
- Calendar
- Reports
- Settings
- Personal Hub
- Resource library
- Markdown-style notes
- Project notes
- Client share links
- Google Calendar sync
- Reminder emails
- Desktop toast notifications
- Tauri desktop app

## Important Constraint

Do not restart the app from scratch. Do not rebuild major architecture unless explicitly requested.

The next chat should make small, focused changes, verify them, and stop. The last thread started looping because it kept trying to continue broad desktop reminder work after context compaction.

## Latest Checkpoint From May 6, 2026

The remaining desktop reminder polish was completed in the current chat.

Implemented:

- Desktop reminder heartbeat is now written by `src/components/notifications/DesktopNotificationBridge.tsx` on every reminder check.
- Heartbeat states cover `disabled`, `idle`, `sent`, and `error`.
- Settings now shows the latest desktop reminder check status, message, and timestamp.
- Tauri tray menu now includes `Hide to tray`.
- Tauri tray tooltip was improved to explain that Align is running and can be opened, hidden, or quit from the tray.
- TypeScript narrowing in `src/integrations/desktop/notifications.ts` was fixed so heartbeat parsing builds cleanly.

Verification completed:

```powershell
npm run build
Set-Location src-tauri
cargo check
git diff --check
```

All three verification steps passed.

Current dirty files after this work:

- `src/components/notifications/DesktopNotificationBridge.tsx`
- `src/integrations/desktop/notifications.ts`
- `src/pages/Settings.tsx`
- `src-tauri/src/lib.rs`
- `NEXT CHAT HANDOFF.md` remains untracked unless intentionally added.

No commit or push was made.

## Recent Concern

The user asked to stop because the assistant was looping around desktop reminder service work. The next chat should first do a careful health check before editing:

1. `git status --short`
2. Inspect changed files only
3. Run one verification command at a time
4. Avoid repeated long-running commands

If there are dirty changes, understand them before editing. Do not revert user work.

## Most Recent Local State

Before this handoff, a health check showed at least one modified file:

- `src/integrations/desktop/notifications.ts`

That file had intentional heartbeat helper additions for desktop reminders:

- `DESKTOP_REMINDER_HEARTBEAT_KEY`
- `DesktopReminderHeartbeatStatus`
- `DesktopReminderHeartbeat`
- `getDesktopReminderHeartbeat`
- `setDesktopReminderHeartbeat`

The intended remaining desktop reminder polish was:

- Add a Tauri tray menu item: `Hide to tray`
- Improve tray tooltip
- Write desktop reminder heartbeat status when reminders are checked
- Show the heartbeat status in Settings
- Verify with `npm run build`, then `cargo check` in `src-tauri`, then `git diff --check`

Only continue that work if the user asks. If the user says “health check only”, do not implement.

## What Is Working

### Project Management

- Create/edit/delete tasks
- Create/edit/delete projects
- Assign tasks to projects
- Project details view
- Task cards and table view
- Search/filter/sort tasks
- Drag-and-drop ordering exists for tasks/projects, though the user previously said the handle/animation could be more intuitive
- Start date and due date exist
- Start time and due time exist
- Reminder and repeat fields exist
- Project categories/workspace tabs exist: business/personal style separation

### Lifecycle / Trash

Lifecycle work was requested and partially/mostly implemented:

- Projects should support active/completed/archived/deleted logic
- Delete should mean soft-delete/trash, not permanent delete
- Trash page/system should replace deleted task list in Settings
- Auto-cleanup target:
  - Tasks after 30 days
  - Projects after 90 days

Confirm current implementation before changing anything here.

### Client Sharing

- Project-level client share links exist.
- Client overview links exist for sharing multiple selected projects.
- Optional password-protected share links were requested and implemented or partially implemented.
- Share links are read-only and separate from signed-in app users.
- User liked the feature but disliked the earlier heavy UI. Sharing section should stay collapsed by default so projects are not pushed too far down.

### Project Notes

- Project Notes feature exists or was being implemented.
- Purpose:
  - Figma links
  - staging links
  - Google Drive links
  - login/access notes
  - handoff notes
- Notes have visibility:
  - Private
  - Client-visible
- Private notes must never appear in public share links.
- Client-visible notes may appear on shared links if included by share logic.
- User liked concepts similar to a structured notes panel, not cramped side previews.

### Personal Hub / Resources

Personal Hub exists as the user’s private studio workspace.

Resource library purpose:

- Inspiration sites
- UI component references
- graphics/assets
- typography/color tools
- AI tools
- motion/3D tools
- developer utilities
- learning/content/blogs
- templates/marketplaces

Imported resource list included:

- Awwwards
- Land Book
- One Page Love
- Lapa Ninja
- Landingfolio
- Landings.dev
- Godly
- Site of Sites
- Webdesign Inspiration
- CSS Design Awards
- The FWA
- Unsection
- Brutalist Websites
- Wix Studio Inspiration
- Dribbble
- Behance
- Pinterest
- Savee
- Designspiration
- Visual Journal
- Navbar Gallery
- Footer Design
- CTA Gallery
- Component Gallery
- UIBits
- Refero
- Commerce Cream
- SaaSpo
- OGfolio
- Killer Portfolio
- Ecomm Design
- Supahero
- Inspo Page
- 60fps Design
- Dark Design
- Resource Boy Patterns
- Heritage Type
- LS Graphics
- Every Tuesday Pattern Playground
- Grainient Supply
- Paaatterns
- Open Peeps
- Humaaans
- Open Doodles
- Feather Icons
- ISO Icons
- Pexels
- Fontshare
- Fontjoy
- Realtime Colors
- UI Gradients
- Happy Hues
- Power Type
- Collletttivo
- Recraft AI
- Lummi AI
- Midjourney
- Kling AI
- Figmify
- Remove.bg
- Spline
- Jitter
- Zajno Motion
- Dither Garden
- Endless Tools
- MageCDN SVG Loaders
- Uiverse
- Design System Checklist
- GitHub Design Resources
- UX Design CC
- Curated Design
- Craftwork Design
- Showit Store
- Bento Grids
- Uncut WTF

User asked for resources to be saved in the database, not just LocalStorage. Confirm current sync implementation before adding more.

Resource UX preferences:

- Do not expand selected resource into a giant block in the middle of the page.
- Preferred pattern: click a resource, show details in a right-side panel.
- Right-side panel should stay visible while scrolling, like a sticky landing-page navbar.
- Preview panel had alignment issues and hidden actions; fix if still present.
- Favorite star exists, but user asked where favorites can be viewed. If favorite remains, add a Favorites filter/tab or remove the action.
- Resources should be editable so missing links can be added.
- Resource cards should feel less blank; a preview/image/favicon/visual card treatment is preferred.

Notes UX preferences:

- Notes should be editable.
- Notes should not be shown in a cramped right panel.
- User liked the newer notes list/editor direction more than the old tight preview.
- Current notes are simple markdown-style notes, not a full rich editor unless upgraded later.

### Authentication / Security

- Supabase auth is used.
- Magic link was used earlier.
- Google sign-in was added and worked.
- Approved user/security gating exists.
- User asked about future multi-user support.
- For now this is still primarily the user’s personal app.
- Future users should only see modules explicitly enabled for them.
- Public client share links should remain accountless/read-only.

Important security principle:

- Service role keys must stay server-only in Vercel env vars.
- Do not expose secrets in frontend code.
- `.env.local` must not be committed.

### Google Calendar

Google Calendar sync worked on web and desktop after reconnecting.

Known recurring issues:

- If Google Calendar shows `Token has been expired or revoked`, the user should disconnect/reconnect.
- If it shows missing `VITE_GOOGLE_CLIENT_ID`, desktop build/env may be missing frontend env values at build time.
- If it shows “provided client secret is invalid”, check server env var `GOOGLE_CLIENT_SECRET`.
- Google Cloud no longer shows old client secrets after creation; a new secret must be created if lost.

Recent desktop issue was fixed by correcting env/build state; user confirmed desktop Google sync worked and created a test successfully.

### Desktop App

Tauri desktop app exists and runs.

Known desktop preferences:

- Should feel native, not just a web wrapper.
- External auth should open the system browser where possible.
- Desktop toast notifications worked in Windows notification center.
- User accepted no auto-update for now.
- Remaining desktop polish is mostly tray/background reminder behavior.

Desktop reminder expectation:

- Web email reminders are enough for browser use.
- Desktop notifications are useful only while desktop app is open or hidden to tray.
- True reminders while the app is fully closed require a native background helper/service or scheduled server reminders.

## Current Remaining Work

The user recently said the live dev environment looks perfect, then asked to optimize/polish and push. After that, the discussion shifted to desktop reminders and then to handoff. Do not assume all those changes were committed/pushed.

Priority order for next chat:

1. Health check local repo.
2. Identify dirty files.
3. Decide whether to finish only desktop reminder heartbeat polish.
4. Verify the app still builds.
5. Ask before committing/pushing if there are unrelated local changes.

Possible remaining product/UI tasks:

- Finish desktop reminder heartbeat status in Settings if not finished.
- Make Tauri app hide-to-tray reliable.
- Add native background reminder service only if the user explicitly wants deeper desktop work.
- Confirm lifecycle/trash UI is simple and not over-layered.
- Confirm Personal Hub right-side preview is sticky and not hiding content.
- Add Favorites view/filter if favorites remain.
- Make resource editing smooth and database-backed.
- Confirm Project Notes visibility rules in share links.

## Commands To Use Carefully

Run one at a time:

```powershell
git status --short
npm run build
git diff --check
```

If checking Tauri:

```powershell
Set-Location src-tauri
cargo check
```

Use PowerShell `-NoProfile` when possible to avoid noisy profile errors.

## Do Not Do Automatically

- Do not `git reset --hard`.
- Do not revert user changes.
- Do not run long repeated commands.
- Do not push unless the user asks or confirms.
- Do not rebuild the project from scratch.
- Do not create new broad features before checking the dirty worktree.

## Good First Message In Next Chat

Suggested assistant response:

“I’ll start with a health check only: git status, changed files, and whether the app builds. I’ll avoid implementing anything until we know the current repo state.”

Then run:

```powershell
git status --short
```

## Product Direction Notes

The user is a web designer/developer. Align is becoming a personal studio operating system, not just a generic PM app.

Likely future modules:

- Project management
- Personal resource vault
- Prompt/content library
- Client pipeline/CRM
- Document/invoice helper
- Personal hub

But the user rejected overly simple placeholder modules that looked like generic notes pages. Future modules should be purpose-built and polished, not clone the same card/list layout.

The user prefers:

- Premium dark UI
- Minimal but useful animations
- Clear spacing
- Practical freelancer workflow features
- Features that save real time, not overbuilt SaaS patterns

## Final Reminder

The next chat should use this handoff as the map and avoid looping through old solved problems. Start small, verify, then proceed.
