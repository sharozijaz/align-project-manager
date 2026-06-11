# Align Security Audit

## Date

2026-06-05

## Summary

Align was audited after a vague email suggested the public repo may have exposed a secret. The GitHub repository is public, but tracked files and local git history did not show committed live secrets, Android signing passwords, private keys, or common token patterns. The real issue was local-only: `private-backups/` and ignored Android signing files contained release signing material/artifacts inside the working tree. Those files were moved outside the repo to quarantine directories and release artifact ignores were expanded.

Align remains designed for two release modes:

- Public/open-source local-first builds with no maintainer backend configured.
- Private or self-hosted cloud builds with explicit Supabase, hosted API, Google, and email configuration.

The Android companion app is outside the public release boundary. It is personal/private only and must not be pushed to the public repository or included in public release artifacts.

The app is not a full enterprise SaaS security product, but the main public-release risks now have code, docs, and process controls. Detailed findings are documented in `docs/security-optimization-audit-2026-06-05.md`.

## Implemented Controls

- Public GitHub visibility was confirmed, and tracked/head/history scans did not find live secrets.
- Local `private-backups/` was moved to `C:\Users\sharo\Documents\Codex\align-sensitive-quarantine\private-backups-20260605-195017`.
- Local Android signing files were moved to `C:\Users\sharo\Documents\Codex\align-sensitive-quarantine\android-signing-20260605-200000`.
- Generated Android build outputs were removed after verification to avoid keeping signed artifacts in the repo tree.
- `.gitignore` now blocks private backups, Android signing keys, APK/AAB artifacts, keystore formats, and Android build outputs.
- `.gitignore` also blocks the private `android-app/` source tree from accidental public staging.
- Fresh installs start blank; demo/personal seed data was removed.
- Local workspace data remains the active copy when Supabase is down or returns an unexpected empty workspace.
- Settings exposes backup/recovery guidance and safety snapshots are created before risky sync/sign-out/import flows.
- Sidebar/profile area exposes Sign Out.
- Public release env guard blocks accidental public builds with configured backend keys or server-only secrets.
- Hosted signed-in APIs enforce Supabase session plus `public.allowed_users`.
- API CORS is allowlisted instead of reflecting arbitrary origins.
- API payload limits, JSON checks, and rate limits are present for sensitive endpoints.
- Google access/refresh tokens are encrypted before storage using `GOOGLE_TOKEN_ENCRYPTION_KEY`.
- Legacy plaintext Google tokens remain readable during migration and are rewritten encrypted on reconnect/refresh.
- Public share APIs return only selected project/task data.
- Personal Hub resources are never returned by share APIs.
- Hub notes are private by default and require explicit client-visible marking before share exposure.
- New project/client share links are password-protected and expire by default.
- Client overview project-detail links inherit the overview password/expiry when links are created or edited.
- Android widget task actions now go through a non-exported broadcast receiver.
- Android auth callbacks are scheme/host allowlisted before sessions are saved.
- Android app backup and cleartext traffic are disabled in the manifest.
- Android release builds now enable R8 minification and resource shrinking.
- Public docs describe local-first use, self-hosting, security, privacy, and release checks.

## Remaining Operational Requirements

- Rotate Android signing credentials if any quarantined backup/signing material was ever uploaded, emailed, cloud-synced, or shared outside this machine.
- Keep `android-app/` private and verify it is not staged before every public commit or release.
- Run `supabase/security-hardening.sql` and insert trusted emails into `public.allowed_users` on private/self-hosted deployments.
- Set `VITE_AUTH_METHOD=google` for private production hosted builds.
- Set `ALLOWED_API_ORIGINS` for production app and desktop origins.
- Set a strong `GOOGLE_TOKEN_ENCRYPTION_KEY` before connecting Google sync.
- Put hosted production behind Cloudflare WAF or equivalent edge rate limiting.
- Review and disable old share links created before password/expiry defaults.
- Run `npm run check:public-release-env`, `npm run check:release`, `git diff --check`, and secret scans before every public release.

## Verified By Code Review

- `api/_googleCalendar.js`: central CORS, allowed-user checks, encrypted Google token read/write, cron helper, service-role fetch helper.
- `api/google-calendar/*`, `api/google-sync.js`, `api/google-todos.js`, `api/reminders/check.js`: signed-in hosted routes use allowed-user checks.
- `api/project-share.js`, `api/client-share.js`: share APIs validate tokens, enforce password checks when present, respect expiry, and filter Hub notes by `client_visible`.
- `scripts/check-public-release-env.mjs`: fails public release builds with configured cloud env or server-only secrets unless explicitly overridden.
- `src/components/auth/AuthGate.tsx`: respects `VITE_AUTH_METHOD`.
- `src/integrations/supabase/projectShares.ts`: new share links default to password and expiry.
- `src/store/*`: demo seed data removed for blank first-run workspaces.
- `android-app/app/src/main/AndroidManifest.xml`: backup disabled, cleartext disabled, task-action receiver non-exported.
- `android-app/app/src/main/java/dev/sharoz/align/widget/AlignTaskWidget.kt`: exported widget provider no longer handles custom task mutation broadcasts.
- `android-app/app/src/main/java/dev/sharoz/align/auth/AuthCallbackActivity.kt`: callback origin validation added.

## Residual Risks

- In-memory rate limiting is not enough for high-volume attacks on serverless infrastructure. Use WAF/edge limits.
- Browser/desktop local storage is only as secure as the user device. Users should protect their OS account and backups.
- Android session tokens are still stored in Preferences DataStore. Plan encrypted token storage for stronger mobile security.
- If `GOOGLE_TOKEN_ENCRYPTION_KEY` is lost, existing encrypted Google tokens cannot be decrypted; reconnect Google.
- Public share tokens are bearer secrets. Passwords and expiry reduce exposure, but users should still share links carefully.
- Supabase schema drift can break guarantees if migrations are skipped. Run release smoke tests against a configured staging project before public release.

## Verification On 2026-06-05

- `npm audit --audit-level=moderate`: passed, `0 vulnerabilities`.
- `npm run check:unused`: passed.
- `npm run check:ts-unused`: passed.
- `npm test`: passed, 5 files / 14 tests.
- `npm run build`: passed.
- `android-app\gradlew.bat :app:assembleDebug`: passed.
- `android-app\gradlew.bat :app:assembleRelease`: passed.
- `npm run check:public-release-env`: failed as expected because local configured cloud frontend env keys are present.

## Release Recommendation

Do not publish a public desktop build until:

1. `npm run check:public-release-env` passes without override for the public build.
2. `npm run check:release` passes.
3. Markdown and secret scans show no private data.
4. A local-only fresh install opens blank and can import/export backups.
5. A private configured build is tested separately and not uploaded as the public release artifact.
