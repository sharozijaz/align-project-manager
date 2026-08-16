# Build Variants

Align uses one app codebase for both the public open-source app and configured/self-hosted builds. Features are enabled by configuration, not by maintaining separate forks.

## Public Open-Source Build

The public build is local-first and offline by default. It must not include default Supabase, Google, Resend, cron, or hosted API configuration.

Use:

```bash
npm run build:public
npm run release:desktop:public
```

These commands set `ALIGN_PUBLIC_RELEASE=true`, clear known cloud and secret environment variables for the child build process, and make Vite read environment files from `config/public-env/` instead of the repository root. This means a private `.env.local` can stay on the developer machine without being bundled into a public release.

Public builds also replace the Supabase client package with a tiny local stub because cloud sync is intentionally unavailable in this variant. Configured and self-hosted builds keep the real Supabase client.

Public builds should be tested in `Local only` mode with no sign-in required.

## Configured Or Self-Hosted Build

Configured builds use the normal commands:

```bash
npm run build
npm run desktop:build
```

If `.env.local` contains Supabase, hosted API, Google, and email settings, those optional features remain available. This is the path for configured desktop/web deployments and for advanced users who self-host their own backend.

## Data Safety

Build variants do not reset app data. Align stores workspace data locally unless cloud sync is enabled. Before installing a public release candidate over an important workspace, export a full JSON backup from Settings.
