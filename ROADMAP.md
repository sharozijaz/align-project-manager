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

- Add MIT license, changelog, contribution guide, privacy notes, and roadmap.
- Update README so local-first usage is the default public path.
- Keep the maintainer's hosted backend private.
- Remove public-user defaults that silently point to the private hosted backend.

## Phase 2 - Full Backup And Data Ownership

- Upgrade workspace backup to include projects, tasks, calendar events, notes, resources, and preferences.
- Add safety backup before restore/import.
- Keep notes-only export/import as a focused tool.
- Make backup status visible in Settings.

## Phase 3 - Local-First Mode Polish

- Add a clear Local-only mode indicator.
- Add Local only, Paused, and Cloud sync mode controls.
- Add in-app guidance for choosing a safe sync mode.
- Hide or gracefully disable cloud-only features when config is missing.
- Keep local desktop reminders and core workflows available.
- Replace cloud setup errors with setup guidance.

## Phase 4 - Self-Hosted Cloud Setup

- Document Supabase, Vercel/serverless APIs, Google OAuth, cron, and email setup.
- Separate frontend-safe env vars from server-only secrets.
- Add local and production env examples.
- Add a short self-hosting checklist.
- Explain that self-hosted users pay their own cloud costs.
- Keep local-only usage as the default public path.

## Phase 5 - GitHub Release Pipeline

- Publish Windows installers through GitHub Releases.
- Keep package and Tauri versions aligned.
- Run checks before release: unused code, TypeScript, audit, build, desktop build, secret scan, and smoke tests.
- First public release can be unsigned, with a documented Windows SmartScreen warning.
- Add GitHub issue templates, PR template, and CI checks for safer public contributions.
- Keep desktop release builds manual until signing and updater automation are ready.

## Phase 6 - Monetization Path

- Keep the local app free and open source.
- Start with paid workflow/template packs for web designers and freelancers.
- Keep one free sample template pack in the public repo.
- Sell paid packs separately from the source repository.
- Offer paid workflow customization as a service after template demand is proven.
- Consider paid hosted Align Cloud later for sync, share links, Google sync, reminders, and backup history.
- Consider signed convenience builds later.

## Phase 7 - Marketing And Positioning

- Position Align as a local-first project and life planning app for freelance web designers and developers.
- Show real workflows: Figma to WordPress, client feedback, weekly planning, notes, and handoff.
- Prepare GitHub screenshots, a landing page, demo video, and launch posts.

## Phase 8 - Project Workspace Polish

- Keep Align focused on solo/local-first project work; client share links remain read-only.
- Add clear assignee visibility and local show/hide field controls for project task views.
- Move quick-add into a modal and keep the project page centered around the active view.
- Refresh Board and Kanban spacing, status color accents, and inline task creation.
