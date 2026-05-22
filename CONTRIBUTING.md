# Contributing

Thanks for considering a contribution to Align.

Align is a local-first project and life planning app for freelance web designers and developers. Contributions should preserve the core promise: the app must remain useful without a hosted backend.

## Development Setup

```bash
npm install
npm run dev
```

Desktop development:

```bash
npm run desktop:dev
```

Production checks:

```bash
npm run check:unused
npm run check:ts-unused
npm audit --audit-level=moderate
npm run build
```

Windows desktop build:

```bash
npm run desktop:build
```

## Contribution Rules

- Keep local-only mode working.
- Do not require Supabase, Vercel, Google, or Resend for core app features.
- Do not commit `.env.local`, service-role keys, OAuth secrets, API keys, refresh tokens, or database passwords.
- Keep cloud features optional and clearly gated by configuration.
- Before changing sync, import, restore, or delete behavior, add a safe backup or rollback path.
- Prefer small, focused pull requests.

## Cloud Features

Supabase sync, Google sync, share links, and email reminders are optional hosted features. They should not silently point at the maintainer's private deployment.

If a feature needs server-side secrets, it must run only in server/API code, never in the frontend or Tauri bundle.
