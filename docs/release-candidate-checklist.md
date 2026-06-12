# Align Release Candidate Checklist

Use this checklist for the v1 release-candidate freeze. During the RC window, avoid new features unless they fix data safety, privacy, sync, or daily-use reliability.

## Release Freeze

- [ ] Create a release-candidate tag after the current stabilization fixes are committed.
- [ ] Treat `main` as feature-frozen for 7 days.
- [ ] Only accept bug fixes, data-loss fixes, security/privacy fixes, sync fixes, and small readability fixes.
- [ ] Keep Android personal/private and do not publish Android source, signing files, APKs, or AABs.

## Core Verification

- [x] `npm run check:ts-unused`
- [x] `npm run check:unused`
- [x] `npm test`
- [x] `npm run build`
- [ ] `npm run desktop:build`
- [ ] Fresh desktop install opens and loads the current workspace.
- [ ] Fresh web build opens and loads the current workspace.
- [ ] Android updated build opens and loads expected personal data.

## Data Safety

- [ ] Export a full workspace JSON backup from Settings.
- [ ] Import that backup into a clean local workspace and confirm projects, tasks, docs, resources, palettes, milestones, snippets, and calendar data load.
- [ ] Confirm restore points create before import, cloud upload/download, and destructive reset actions.
- [ ] Confirm deleted/completed project cleanup removes project-only docs and palettes as expected.
- [ ] Confirm Resources survive refresh, app restart, and cloud sync.
- [ ] Confirm Notes autosave survives refresh, app restart, and cloud sync.

## Sync And Accounts

- [ ] Run `supabase/grants.sql` in Supabase SQL Editor before final cloud testing.
- [ ] Confirm Cloud sync uploads and downloads resources, notes, palettes, milestones, snippets, projects, tasks, todos, and calendar events.
- [ ] Confirm Local-only mode blocks upload/download.
- [ ] Confirm Paused mode keeps sign-in but avoids automatic upload/download.
- [ ] Confirm sign-out creates a safety backup before local workspace isolation.
- [ ] Confirm a different account does not receive the current local workspace.

## Privacy And Sharing

- [ ] Confirm private notes do not appear in project share links.
- [ ] Confirm only notes marked `clientVisible` and linked to the shared project appear in share links.
- [ ] Confirm resources never appear in public share links.
- [ ] Confirm new share links are password-protected or intentionally created without a password.
- [ ] Confirm expired or disabled share links stop loading.
- [ ] Do not store passwords, API keys, recovery codes, or private credentials in Notes until encrypted notes exist.

## Desktop QA

- [ ] Desktop app launches normally.
- [ ] Tray behavior works.
- [ ] Start-with-Windows setting works if enabled.
- [ ] Desktop reminders fire while the app is open.
- [ ] Desktop reminders play the Windows notification sound.
- [ ] Right-click browser/WebView menus are suppressed where expected and remain available in text-editing fields.
- [ ] Deep links still work for auth callback.
- [ ] Light and dark themes are readable.

## Daily-Use Trial

Run Align as the only workspace for 7 days.

- [ ] Day 1: create/update projects, tasks, todos, docs, and resources.
- [ ] Day 2: use Today as the daily execution surface.
- [ ] Day 3: use Dashboard as portfolio health.
- [ ] Day 4: use project Docs, palettes, and task/doc links.
- [ ] Day 5: test reminders, calendar, and desktop notifications.
- [ ] Day 6: test backups, restore points, and Supabase sync.
- [ ] Day 7: review bug list and decide whether to tag v1.0 or run another RC.

## Release Decision

Ship v1 only when:

- [ ] No known data-loss bugs remain.
- [ ] Backups and restore have been manually verified.
- [ ] Notes/resources survive refresh, restart, desktop/web switching, and sync.
- [ ] Public share links expose only intended client-visible data.
- [ ] Android remains private and excluded from public release artifacts.
