# Align Release Guide

This guide is the Phase 5 release pipeline for publishing Align desktop builds through GitHub Releases. It keeps the public release local-first while leaving Supabase, Google sync, email reminders, and share links optional for users who bring their own backend.

## Release Model

- GitHub `main` is the source of truth for app code and documentation.
- The public Windows desktop app should work in `Local only` mode without a hosted backend.
- Cloud sync, Google integrations, share links, and email reminders are optional self-hosted features.
- `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` must use the same release version.
- The package stays `"private": true` because Align is released through GitHub, not npm.

## Before Changing Versions

Start from a clean repo:

```powershell
git status --short --branch
git pull origin main
npm install
```

Confirm the current app runs locally before preparing a release:

```powershell
npm run dev
```

## Version Checklist

For a release `X.Y.Z`, update:

- `package.json`
- `package-lock.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `CHANGELOG.md`

Use a patch version for fixes, a minor version for visible features, and a major version only for breaking data or setup changes.

## Required Checks

Run the release check:

```powershell
npm run check:release
```

This runs:

- unused-code check
- TypeScript unused symbol check
- npm audit at moderate severity or higher
- production web build

Then run these additional checks:

```powershell
git diff --check
rg -n "(service_role|client_secret|api[_-]?key|password|token|Bearer\\s+[A-Za-z0-9._-]+)" --glob "!node_modules/**" --glob "!dist/**" --glob "!src-tauri/target/**" --glob "!package-lock.json"
```

The secret scan can show placeholder names in docs or env examples. Investigate every match and only proceed when there are no real secrets.

## Desktop Build

Build the Windows installer:

```powershell
npm run release:desktop
```

Expected output:

```text
src-tauri/target/release/bundle/nsis/Align_X.Y.Z_x64-setup.exe
src-tauri/target/release/bundle/msi/Align_X.Y.Z_x64_en-US.msi
```

Use the NSIS `.exe` as the primary public installer. The `.msi` can be attached as an alternate installer if it builds successfully.

## Manual Smoke Tests

Test the web app locally:

- Open the dashboard.
- Create, edit, complete, reorder, and delete a project task.
- Open project card, table, board, and kanban views.
- Drag project cards and task cards where supported.
- Open Calendar Month, Week, and Agenda.
- Drag a task from `Plan This Work` to the calendar, then drag it back.
- Create and autosave a note, then refresh and confirm it is still there.
- Export a full workspace backup.
- Import a backup into a throwaway browser profile or test workspace.

Test the desktop app:

- Install over the previous build.
- Confirm the app opens, closes to tray, restores from tray, and quits from the tray menu.
- Confirm local data remains present after update.
- Confirm `Local only`, `Paused`, and `Cloud sync` controls still render.
- Confirm desktop notifications can be tested from Settings when supported.
- Confirm external links open in the system browser.
- Confirm drag and drop works in the desktop WebView for projects, tasks, calendar, and kanban.

Only test Google, Supabase, email, and share links against your own configured environment. Public users should not depend on the maintainer's private hosted backend.

## GitHub Release

Create the tag:

```powershell
git tag vX.Y.Z
git push origin vX.Y.Z
```

Create a GitHub Release:

- Title: `Align vX.Y.Z`
- Attach the NSIS `.exe` installer.
- Attach the `.msi` installer if available and tested.
- Include release notes from `CHANGELOG.md`.
- Include a note that the first public Windows builds may be unsigned.

Suggested unsigned-build note:

```text
This Windows build is currently unsigned. Windows SmartScreen may show a warning until Align has signed releases and reputation history. Download only from the official GitHub Releases page.
```

## Rollback

- Keep the previous installer until the new release is confirmed.
- If a desktop update opens empty, do not create replacement data. Restore from a JSON backup or use Settings > Supabase Sync > Download Now if cloud sync was enabled.
- If a release has a serious issue, mark it as pre-release or delete the broken assets, then publish a patch release.

## Future Automation

Phase 5 starts with manual Windows builds plus CI checks. Future improvements can add:

- signed Windows installers
- Tauri updater support
- a Windows GitHub Actions desktop build
- checksum files for release assets
- automated Playwright smoke tests
