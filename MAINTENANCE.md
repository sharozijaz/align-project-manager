# Align Maintenance Guide

This guide is for maintaining Align after the project is finished. It covers safe updates, security checks, rebuilds, desktop installers, and cleanup.

## Source Of Truth

- GitHub `main` is the source of truth for app code and documentation.
- Supabase is the source of truth for live user data.
- Vercel deploys the web app from the repo.
- The desktop app is rebuilt from the same source code with Tauri.
- `.env.local` is private local configuration and must never be committed.

## Recent Finalization Notes

Recent work completed before the Windows reinstall prep:

- Added the Todos page and Google Todo Sync. Project tasks stay in Align; personal/unprojected work syncs with the Google `Align Todos` list.
- Reworked the main navigation into the compact sidebar and moved secondary tools into cleaner menus.
- Improved Personal Hub notes with a notes workspace, project links, JSON export/import, Markdown export/import, and safer note backups.
- Added selectable dashboard hero backgrounds from bundled WebP assets.
- Added more themes, removed the too-bright white theme, and added the light-theme logo asset.
- Hardened share links so desktop share URLs point at `https://align.sharoz.dev` instead of `tauri.localhost`.
- Hardened user isolation in Supabase workspace sync by explicitly scoping project, task, calendar, resource, and note rows to `user_id`.
- Fixed a desktop sync startup bug where a freshly updated app could appear empty until Settings > Supabase Sync > Download Now was pressed.
- Built and saved the Windows `.exe` and `.msi` installers before cleanup.
- Cleaned generated folders so the backup copy is small.

Important recovery note: if an installed desktop app opens empty after an update or reinstall, go to Settings > Supabase Sync and press **Download Now**. The cloud workspace is the source of truth.

## After Folder Cleanup

The project folder was cleaned to save space. These rebuildable folders may be missing:

```text
node_modules/
dist/
src-tauri/target/
.vercel/output/
```

That is expected. The latest cleanup removed `node_modules/`, `dist/`, `src-tauri/target/`, and `tmp-preview.log`, reducing the project folder to about 15 MB.

To restore the build environment:

```powershell
git pull origin main
npm install
```

To rebuild the web app:

```powershell
npm run build
```

To rebuild the Windows desktop installer:

```powershell
npm run desktop:build
```

Installer output appears under:

```text
src-tauri/target/release/bundle/
```

Use the NSIS `.exe` installer for normal Windows updates.

## When To Update

Check for updates at least once a month, and also update when:

- GitHub reports a security alert.
- `npm audit` reports a high or critical issue.
- Tauri, Vite, React, Supabase, or auth-related packages publish a security fix.
- Google, Supabase, Vercel, or Resend changes an API or required configuration.
- Windows desktop behavior changes after a WebView2 or OS update.

Avoid blind major upgrades. Patch and minor updates are usually safer; major updates should be tested carefully and read against release notes.

## Monthly Security Check

Run these from the repo root:

```powershell
git status --short --branch
git pull origin main
npm audit
npm outdated
```

For Rust/Tauri dependency checks:

```powershell
Set-Location src-tauri
cargo update --dry-run
cargo check
Set-Location ..
```

Optional Rust security audit:

```powershell
cargo install cargo-audit
Set-Location src-tauri
cargo audit
Set-Location ..
```

If an audit reports a high or critical issue, update the affected package, rebuild, test, commit, and push.

## Safe Update Workflow

1. Start clean:

```powershell
git status --short --branch
git pull origin main
```

2. Install dependencies if `node_modules` is missing:

```powershell
npm install
```

3. Apply safe npm updates:

```powershell
npm update
```

For a specific package:

```powershell
npm install package-name@latest
```

4. Apply compatible Rust updates:

```powershell
Set-Location src-tauri
cargo update
cargo check
Set-Location ..
```

5. Verify the app:

```powershell
npm run build
npm run desktop:build
git diff --check
```

6. Test manually:

- Open the web app locally or on Vercel.
- Open the Windows desktop app.
- Confirm sign-in, projects, tasks, calendar, reminders, sharing, and settings still work.
- Quit Align from the tray before installing a fresh desktop build.
- Run the newest NSIS `.exe` installer over the old install.

7. Commit and push:

```powershell
git status --short
git add .
git commit -m "Update dependencies"
git push origin main
```

## Web Deployment

If Vercel is connected to GitHub, pushing to `main` should deploy the web app automatically.

After deployment, check:

- `https://align.sharoz.dev` opens.
- Sign-in works.
- Supabase data loads.
- Google Calendar sync still redirects correctly.
- Reminder email routes still have the required Vercel environment variables.

Required secrets are listed in `README.md`. Never put private keys into frontend code.

## Desktop Release

Build the installer:

```powershell
npm install
npm run build
npm run desktop:build
```

Expected Windows installer path pattern:

```text
src-tauri/target/release/bundle/nsis/Align_VERSION_x64-setup.exe
```

Recommended release steps:

1. Quit Align from the tray menu.
2. Run the newest NSIS `.exe` installer.
3. Open Align.
4. Sign in with the same Supabase account.
5. Confirm Settings > Supabase Sync is healthy.
6. Confirm reminders, tray behavior, custom title bar, and scrolling still look right.

The desktop app is a client shell. Data should come back through Supabase after sign-in. Manual JSON restore is only needed if cloud sync was disabled or the workspace was never uploaded.

## Cleanup After Release

After a release is tested, these generated folders can be deleted to save space:

```text
node_modules/
dist/
src-tauri/target/
.vercel/output/
```

PowerShell cleanup from the repo root:

```powershell
Remove-Item -Recurse -Force node_modules, dist, src-tauri\target, .vercel\output -ErrorAction SilentlyContinue
Remove-Item -Force tsconfig.tsbuildinfo, tsconfig.node.tsbuildinfo, vite-dev.log -ErrorAction SilentlyContinue
```

Do not delete:

- `.git/`
- `src/`
- `src-tauri/`
- `supabase/`
- `api/`
- `package.json`
- `package-lock.json`
- `Cargo.toml`
- `Cargo.lock`
- `.env.local`

Also keep any saved desktop installers outside the cleaned repo folder if you need them during a Windows reinstall.

## Windows Reinstall Restore Checklist

After reinstalling Windows:

1. Restore this project folder.
2. Install Node.js LTS.
3. Install Rust from `https://rustup.rs`.
4. Install Microsoft C++ Build Tools with MSVC and Windows SDK.
5. Open PowerShell in the repo root.
6. Run:

```powershell
npm install
npm run build
```

7. For desktop development/building, run:

```powershell
npm run desktop:build
```

8. Install Align from the saved NSIS `.exe` or newly built installer.
9. Sign in with the same Supabase account.
10. If the desktop app appears empty, use Settings > Supabase Sync > Download Now.

Back up `.env.local` privately. It is needed for local builds, but it must not be uploaded publicly.

## Secrets And Security Rules

- Never commit `.env.local`.
- Never commit `SUPABASE_SERVICE_ROLE_KEY`.
- Never commit Google client secrets, Resend keys, database passwords, or OAuth secrets.
- Frontend code should only use public `VITE_*` values.
- Service-role Supabase logic belongs only in server/API routes or Vercel environment variables.
- If a secret is accidentally exposed, rotate it immediately in the provider dashboard and update Vercel/local env vars.

## Useful Troubleshooting

Missing `node_modules`:

```powershell
npm install
```

No installer exists after cleanup:

```powershell
npm run desktop:build
```

Supabase schema cache error after SQL changes:

```sql
notify pgrst, 'reload schema';
```

Desktop shows an old UI:

- Quit Align from the tray menu.
- Install the newest NSIS `.exe`.
- Open Align again.
- The desktop build clears stale service-worker caches automatically.

Desktop opens but projects/tasks are missing:

- Do not create lots of new data first.
- Go to Settings > Supabase Sync.
- Press **Download Now**.
- Confirm projects, tasks, resources, and notes return.
- The current app keeps local data if a normal cloud pull is empty and saves a local backup before signed-out/account-switch clears.

## Optional Release Tag

After a tested release, you can tag the version:

```powershell
git tag v0.2.1
git push origin v0.2.1
```

Only tag after the web app and desktop installer are tested.
