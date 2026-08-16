# Security And Optimization Audit - 2026-06-05

## Executive Summary

The GitHub repository `sharozijaz/align-project-manager` is public. A repo and history scan did not find committed Android signing passwords, private keys, service-role secrets, API keys, or common token formats. The highest-risk findings were local-only: `private-backups/` contained Android release APK/ZIP artifacts plus signing material, and `android-app/` contained ignored signing files. These were moved out of the repo to private quarantine folders outside the public repo. `.gitignore` was expanded to block backup folders, Android signing keys, APKs, AABs, keystores, and build outputs.

Security hardening was applied to Android: task-changing widget actions now use a non-exported receiver, auth callback URLs are allowlisted before a session is saved, app backup is disabled, cleartext traffic is explicitly disabled, and release builds now enable R8 minification/resource shrinking.

## Scope

- Web app: `src/`, `public/`, `vite.config.*`, `package*.json`
- Hosted API: `api/`
- Supabase schema and RLS: `supabase/`
- Desktop: `src-tauri/`
- Android: `android-app/`
- Release/docs tooling: `scripts/`, root Markdown docs, `docs/`
- Git/GitHub exposure: local `HEAD`, all local git history, and GitHub API repository visibility check

## GitHub And Secret Exposure Findings

| Check | Result | Notes |
| --- | --- | --- |
| GitHub visibility | Public | GitHub API reports `visibility: public`, `private: false`. |
| Tracked `HEAD` sensitive filename scan | Pass | No tracked `.env`, `.jks`, APK/ZIP backup folder, or keystore file was found. |
| Git history sensitive content scan | Pass | No committed signing passwords, private keys, GitHub tokens, OpenAI-style keys, Google API-key pattern, or AWS key pattern found. |
| Working-tree sensitive scan | Finding remediated | `private-backups/` and ignored Android signing files contained release signing material/artifacts; moved to quarantine outside the repo. |
| Public release env guard | Expected fail locally | Local frontend cloud env keys are configured. This is a release-control warning, not proof of secret leakage. Use local-first env for public builds, or override only for private builds. |
| Dependency audit | Pass | `npm audit --audit-level=moderate` reported `0 vulnerabilities`. |

No real secret values are documented here. If the Android signing key in quarantine was ever uploaded elsewhere or shared, rotate it by creating a new release keystore and updating Play/App release signing procedures.

## Code Changes Applied

| Area | Change | Security/optimization effect |
| --- | --- | --- |
| `.gitignore` | Added `private-backups/`, Android APK/AAB/JKS patterns, keystore extensions, and build outputs. | Reduces accidental public release of secrets and binary artifacts. |
| Android manifest | Set `allowBackup="false"`, `fullBackupContent="false"`, and `usesCleartextTraffic="false"`. | Reduces token/local-data exposure via device backups and plaintext network mistakes. |
| Android widget | Moved complete/delete actions to `WidgetTaskActionReceiver` with `android:exported="false"`. | Prevents other apps from sending spoofed task mutation broadcasts to the exported app-widget provider. |
| Android auth | Added callback scheme/host allowlist before saving sessions. | Blocks arbitrary deep-link URLs from being treated as auth callbacks. |
| Android release | Enabled `isMinifyEnabled` and `isShrinkResources`; added ProGuard rules. | Optimizes release APK and reduces exposed implementation surface. |
| Local artifacts | Moved `private-backups/`, `android-app/keystore.properties`, and `android-app/align-release.jks` to quarantine outside the repo; removed generated Android build outputs. | Keeps sensitive backup/signing files and signed artifacts away from git add/push paths. |

## Security Posture By Surface

### Web

- Supabase frontend config uses `VITE_*` values only; these are public by design but can bind a public build to a hosted backend.
- Supabase sessions use PKCE and persisted refresh handled by `@supabase/supabase-js`.
- Public share pages call hosted APIs with share tokens. Tokens are bearer secrets, mitigated by 48-hex-token validation, optional password checks, default expiry, and rate limiting.
- Service worker does not cache `/api/*` responses and only handles same-origin GET/static/navigation requests.

### Hosted API

- `api/_googleCalendar.js` centralizes CORS allowlisting, Supabase session validation, allowlisted-user checks, cron bearer authorization, service-role Supabase calls, and Google token encryption.
- `api/_security.js` adds JSON checks, payload size limits, in-memory rate limits, and controlled string/date sanitization.
- Google OAuth tokens are stored encrypted with `GOOGLE_TOKEN_ENCRYPTION_KEY`; plaintext legacy tokens are supported only for migration.
- Remaining risk: in-memory rate limits are not sufficient against distributed traffic or serverless scaling. Use Cloudflare/Vercel edge limits/WAF for production.

### Supabase

- SQL includes RLS for user-owned rows and stricter allowed-user/feature-access policies.
- Google token tables revoke direct `anon`/`authenticated` access and rely on service-role API routes.
- Share-link tables are RLS-protected for owners; public read access is performed only through hosted API service-role routes.
- Remaining risk: production security depends on actually applying `supabase/security-hardening.sql`, share-link repair migrations, and feature-access migrations after schema resets.

### Desktop

- Tauri CSP blocks object embedding and frame ancestors, limits scripts to self, and restricts forms.
- Desktop permissions are limited to core window controls, opener, deep-link, notification, and autostart.
- Remaining risk: desktop local storage/session safety depends on the user's OS account and device security.

### Android

- Local Room/DataStore storage remains device-local and syncs to Supabase only when configured.
- Session tokens are still stored in normal Preferences DataStore. This is acceptable for a first hardening pass but should move to encrypted storage for a stronger mobile posture.
- Exported Android auth callback is now host/scheme validated. Widget task mutations now use a non-exported receiver.
- Android release builds now shrink/minify resources and code.

## Duplicate And Unused Code Review

- `npm run check:unused` passed.
- `npm run check:ts-unused` passed.
- Large duplication exists between `api/project-share.js` and `api/client-share.js` row mapping/share validation code. It is not dead code, but it is a maintenance risk. Consider extracting shared helpers after the current security pass.
- `android-app/` is currently untracked in git. Decide whether Android should be committed publicly. If yes, commit only source/config examples, never signing keys or release outputs.
- Generated folders and artifacts (`dist/`, Android build outputs) are ignored and should not be committed.

## Verification

| Command | Result |
| --- | --- |
| `npm audit --audit-level=moderate` | Pass, `0 vulnerabilities`. |
| `npm run check:unused` | Pass. |
| `npm run check:ts-unused` | Pass. |
| `npm test` | Pass, 5 files / 14 tests. |
| `npm run build` | Pass. |
| `android-app\gradlew.bat :app:assembleDebug` | Pass. |
| `android-app\gradlew.bat :app:assembleRelease` | Pass. |
| `npm run check:public-release-env` | Failed as expected because local configured cloud frontend env keys are present. |

## Required Follow-Up

1. Rotate Android signing credentials if any quarantined signing material may have been uploaded, emailed, synced, or shared outside this machine.
2. Keep `private-backups` outside the repo permanently. Store signing keys in a password manager or encrypted vault.
3. Before any public release, run `npm run check:public-release-env` in a local-first environment with no configured backend values.
4. Confirm Supabase production has `security-hardening.sql`, share-link RLS fixes, feature access, and Google token migrations applied.
5. Add edge WAF/rate limiting for `/api/*`, `/share/*`, OAuth callback, reminder, and cron routes.
6. Plan Android encrypted token storage using AndroidX Security or an equivalent encrypted DataStore layer.
