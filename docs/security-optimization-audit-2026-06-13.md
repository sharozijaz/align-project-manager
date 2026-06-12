# Security And Optimization Audit - 2026-06-13

## Executive Summary

Align is in good release-candidate shape across web, desktop, and the private Android app. The web/desktop checks pass, desktop packaging succeeds, Android release assembly succeeds, and no tracked `.env`, Android signing material, APK/AAB, workspace backup, or obvious high-risk secret pattern is present in the public git index.

This audit also removed stale public hero/banner assets and duplicate generated Vite config files. The remaining important release rule is unchanged: public builds must be local-first unless a private/self-hosted configured backend release is intentional.

## Verification Results

| Check | Result | Notes |
| --- | --- | --- |
| `npm run check:ts-unused` | Pass | TypeScript, unused locals, and unused parameters are clean. |
| `npm run check:unused` | Pass | Knip found no unused exports/files that block release. |
| `npm test` | Pass | 5 test files, 14 tests passed. |
| `npm audit --audit-level=moderate` | Pass | 0 vulnerabilities reported. |
| `npm run build` | Pass | Production web build completed. |
| `npm run desktop:build` | Pass | Tauri built `align.exe`, MSI, and NSIS installer. |
| `android-app .\gradlew.bat assembleRelease` | Pass | Release APK assembled; Android tooling emitted one SDK XML version warning only. |
| `npm run check:public-release-env` | Expected fail locally | Local `.env.local` has configured cloud/frontend keys. This correctly blocks accidental public configured-backend builds. |

## Cleanup Completed

- Removed old tracked fantasy/illustration banner assets from `public/` and `public/heroes/`.
- Kept only the current generated gradient project covers:
  - `align-gradient-amber.png`
  - `align-gradient-emerald.png`
  - `align-gradient-mist.png`
  - `align-gradient-violet.png`
- Removed stale service-worker precache entry for `hero-mountain.webp`.
- Bumped service worker cache from `align-static-v6` to `align-static-v7`.
- Fixed project templates that referenced non-existent cover IDs:
  - `align-gradient-cobalt` -> `align-gradient-mist`
  - `align-gradient-rose` -> `align-gradient-mist`
  - `align-gradient-slate` -> `align-gradient-emerald`
- Updated the starter template hero preference from the removed `midnight-mountain` to `align-gradient-mist`.
- Removed duplicate generated Vite config artifacts:
  - `vite.config.js`
  - `vite.config.d.ts`
- Kept the source of truth: `vite.config.ts`.

## Secret And Privacy Scan

Tracked git files were checked for:

- `.env` / `.env.local`
- Android signing files
- APK/AAB artifacts
- private backup folders
- private-key blocks
- common OpenAI, Google, GitHub, Resend, and JWT-like token patterns

Result: no tracked high-risk secret patterns were found. One scanner hit was reviewed and confirmed as a false positive: `ensure_task_subitem_parent_trigger` in `supabase/task-subitems.sql` matched a broad `re_...` pattern but is only a SQL trigger name.

Ignored local private files still exist and must stay private:

- `.env.local`
- `android-app/`
- Android release APK/build outputs
- Android signing files inside the ignored Android project
- `dist/`
- `src-tauri/target/`

These are ignored by git and are not part of the public tracked repository.

## Login Attempt Cooldown

The magic-link cooldown is client-side UI protection in:

- `src/hooks/useMagicLinkCooldown.ts`
- `src/components/auth/AuthGate.tsx`
- `src/pages/Settings.tsx`

This cooldown is intentionally visible in source because it ships in the frontend. It should not be considered a real anti-abuse control: a determined attacker can bypass client-side cooldowns. Real protection must come from Supabase/Auth provider rate limits and hosted edge protections.

Current status:

- Normal magic-link resend cooldown: 90 seconds.
- Rate-limit error cooldown: 300 seconds.
- This improves UX and reduces accidental repeat sends.
- It does not prevent live-app abuse by itself.

Recommendation:

- Keep Supabase Auth rate limits enabled.
- For hosted/public deployments, add Cloudflare/Vercel edge rate limiting on auth-adjacent routes and hosted APIs.
- Do not depend on frontend cooldown as a security boundary.

## Web And Hosted Security

Strong points:

- Supabase RLS migrations exist for user-owned tables.
- `security-hardening.sql` restricts allowed hosted users through `public.allowed_users`.
- Share APIs validate 48-hex share tokens.
- Share APIs only return client-visible project docs.
- Resources are not returned by share APIs.
- Share password checks use timing-safe comparison.
- Google tokens are encrypted server-side when hosted Google sync is configured.
- Public release guard blocks accidental configured-backend public builds.

Remaining operational requirements:

- Run `supabase/grants.sql` after schema/table changes.
- Run `supabase/security-hardening.sql` for private hosted deployments.
- Keep service-role keys only in server/Vercel env vars.
- Use edge/WAF rate limits for `/api/*`, `/share/*`, OAuth callback, reminders, and cron routes.

## Desktop Security And Cleanliness

Strong points:

- Desktop build passes.
- Tauri package builds MSI and NSIS installer.
- Desktop WebView context-menu guard exists.
- Desktop notification sound fix is included.
- Tauri build output is ignored under `src-tauri/target/`.
- Deep-link auth callback is validated by scheme/host/path in desktop auth code.

Notes:

- The generated installers are local artifacts and ignored by git.
- Desktop local workspace data is still plaintext on the device. Treat the Windows user account as the security boundary.

## Android Security And Cleanliness

Android is still private/personal-use only and ignored by git.

Strong points checked:

- `android-app/` is ignored.
- `android:allowBackup="false"`.
- `android:fullBackupContent="false"`.
- `data_extraction_rules.xml` excludes cloud backup and device transfer.
- `android:usesCleartextTraffic="false"`.
- Auth callback accepts only `align://auth` and `https://align.sharoz.dev`.
- Widget task action receiver is non-exported.
- Reminder alarm receiver is non-exported.
- Release build enables R8 minification and resource shrinking.
- Android release build succeeds.

Important local-only risk:

- Android signing files and release APKs exist inside the ignored `android-app/` folder. They are not tracked, but they are physically inside the repo directory.

Recommendation:

- Keep `android-app/` ignored and private.
- Do not zip/upload the full local workspace folder as a public release.
- For strongest hygiene, keep Android signing material outside the repo tree and reference it from local Gradle properties.

## Notes/Data Safety

Current notes, resources, projects, tasks, palettes, snippets, and backups are not encrypted.

Safe enough for:

- project plans
- sitemaps
- briefs
- research
- palettes
- non-secret references

Not safe for:

- passwords
- API keys
- recovery codes
- private keys
- client credentials
- payment/banking secrets

Recommendation:

- Continue using a password manager for credentials.
- Add encrypted sensitive notes/vault later if needed.

## Release Readiness Judgment

Status: good RC hygiene after this cleanup.

Ship/public-readiness still depends on release mode:

- Private configured build: OK if you intentionally use your own Supabase/Vercel backend and keep Android private.
- Public open-source build: use local-first env, no configured backend, no Android app, no private build artifacts.

## Follow-Up Checklist

- [ ] Commit this cleanup.
- [ ] Push after review.
- [ ] If creating a public source archive, build it from git-tracked files only.
- [ ] Do not include ignored `.env.local`, `android-app/`, `dist/`, or `src-tauri/target/`.
- [ ] Run `npm run check:public-release-env` with local-first env before any public release.
- [ ] Keep the 7-day RC trial focused on data loss, sync, privacy, and install/update behavior.
