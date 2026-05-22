# Align Production And Open Source Roadmap

Align is moving toward a public, open-source Windows desktop release while keeping the maintainer's private hosted backend protected.

## Current Foundation

- React, TypeScript, Vite, Tailwind CSS, Zustand, and Tauri.
- LocalStorage-backed projects, tasks, todos, calendar events, notes, and preferences.
- Optional Supabase sync and Auth.
- Optional Google sign-in, Google Calendar sync, Google Todo sync, email reminders, and client share links for configured hosted deployments.
- Windows desktop build with tray/background behavior and desktop notifications.
- Security docs, API rate limits, payload limits, CSP, and ignored local env files.

## Phase 1 - Public Release Foundation

Owner: Sharoz Ijaz. Executor: Codex or maintainer.

- Add MIT license, changelog, contribution guide, privacy notes, and roadmap.
- Update README so local-first usage is the default public path.
- Keep the maintainer's hosted backend private.
- Remove public-user defaults that silently point to the private hosted backend.

## Phase 2 - Full Backup And Data Ownership

Owner: Sharoz Ijaz. Executor: Codex or maintainer.

- Upgrade workspace backup to include projects, tasks, calendar events, notes, resources, and preferences.
- Add safety backup before restore/import.
- Keep notes-only export/import as a focused tool.
- Make backup status visible in Settings.

## Phase 3 - Local-First Mode Polish

Owner: Sharoz Ijaz. Executor: Codex or maintainer.

- Add a clear Local-only mode indicator.
- Add Local only, Paused, and Cloud sync mode controls.
- Add in-app guidance for choosing a safe sync mode.
- Hide or gracefully disable cloud-only features when config is missing.
- Keep local desktop reminders and core workflows available.
- Replace cloud setup errors with setup guidance.

## Phase 4 - Self-Hosted Cloud Setup

Owner: Sharoz Ijaz. Executor: Codex or maintainer.

- Document Supabase, Vercel/serverless APIs, Google OAuth, cron, and email setup.
- Separate frontend-safe env vars from server-only secrets.
- Explain that self-hosted users pay their own cloud costs.
- Keep local-only usage as the default public path.

## Phase 5 - GitHub Release Pipeline

Owner: Sharoz Ijaz. Executor: Codex or maintainer.

- Publish Windows installers through GitHub Releases.
- Keep package and Tauri versions aligned.
- Run checks before release: unused code, TypeScript, audit, build, desktop build, secret scan, and smoke tests.
- First public release can be unsigned, with a documented Windows SmartScreen warning.

## Phase 6 - Monetization Path

Owner: Sharoz Ijaz. Executor: Sharoz Ijaz with Codex support.

- Keep the local app free and open source.
- Consider paid hosted Align Cloud later for sync, share links, Google sync, reminders, and backup history.
- Consider paid workflow/template packs for web designers and freelancers.
- Consider paid support, customization, and signed convenience builds.

## Phase 7 - Marketing And Positioning

Owner: Sharoz Ijaz. Executor: Sharoz Ijaz with Codex support.

- Position Align as a local-first project and life planning app for freelance web designers and developers.
- Show real workflows: Figma to WordPress, client feedback, weekly planning, notes, and handoff.
- Prepare GitHub screenshots, a landing page, demo video, and launch posts.
