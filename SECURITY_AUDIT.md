# Align Security Audit

## Date

2026-05-24

## Summary

Align is now hardened for two release modes:

- Public/open-source local-first builds with no maintainer backend configured.
- Private or self-hosted cloud builds with explicit Supabase, hosted API, Google, and email configuration.

The app is not a full enterprise SaaS security product, but the main public-release risks now have code and process controls.

## Implemented Controls

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
- Public docs describe local-first use, self-hosting, security, privacy, and release checks.

## Remaining Operational Requirements

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

## Residual Risks

- In-memory rate limiting is not enough for high-volume attacks on serverless infrastructure. Use WAF/edge limits.
- Browser/desktop local storage is only as secure as the user device. Users should protect their OS account and backups.
- If `GOOGLE_TOKEN_ENCRYPTION_KEY` is lost, existing encrypted Google tokens cannot be decrypted; reconnect Google.
- Public share tokens are bearer secrets. Passwords and expiry reduce exposure, but users should still share links carefully.
- Supabase schema drift can break guarantees if migrations are skipped. Run release smoke tests against a configured staging project before public release.

## Release Recommendation

Do not publish a public desktop build until:

1. `npm run check:public-release-env` passes without override for the public build.
2. `npm run check:release` passes.
3. Markdown and secret scans show no private data.
4. A local-only fresh install opens blank and can import/export backups.
5. A private configured build is tested separately and not uploaded as the public release artifact.
