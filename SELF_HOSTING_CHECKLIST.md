# Self-Hosting Checklist

Use this as the short path after reading `SELF_HOSTING.md`.

## Local-Only Test

- Install dependencies with `npm install`.
- Run `npm run dev`.
- Open the app and keep Settings > Data > Sync Mode on `Local only`.
- Create a test project, task, calendar item, and note.
- Export a full workspace backup from Settings > Data.

## Supabase Setup

- Create your own Supabase project.
- Run `supabase/schema.sql`.
- Run the migration scripts listed in `SELF_HOSTING.md`.
- Run `notify pgrst, 'reload schema';`.
- Add your own allowed user email if using allowlisting.
- Add Supabase Site URL and Redirect URLs.
- Copy your Supabase URL and anon key into `.env.local`.
- Keep the service-role key server-only.

## Hosted API Setup

- Deploy the app and `api/` routes to Vercel or another API host.
- Set frontend-safe variables on the frontend host.
- Set server-only variables only on the API host.
- Set `CRON_SECRET` before enabling cron endpoints.
- Confirm `/api/google-calendar/status` or `/api/google-sync` returns an authenticated response rather than a missing-config error.

## Google Setup

- Configure Supabase Google provider for Google sign-in.
- Configure Google OAuth redirect for Calendar/Todo sync:
  `https://your-app.example.com/api/google-calendar/callback`
- Keep the Google client secret server-only.
- Connect Google Calendar/Todo from Settings only after hosted API routes work.

## Sync Safety Test

- Export a full backup before enabling cloud sync.
- Set Sync Mode to `Paused`.
- Sign in.
- Use `Upload Now`.
- Open another browser/device, sign in, and use `Download Now`.
- Confirm projects, tasks, notes, resources, and calendar items appear.
- Switch to `Cloud sync` only after manual upload/download succeeds.

## Desktop Test

- Set `VITE_APP_URL` and `VITE_PUBLIC_APP_URL` if the desktop app should use hosted APIs.
- Run `npm run desktop:build`.
- Install the desktop build.
- Confirm local-only mode works without hosted services.
- If using cloud sync, sign in and verify Settings > Data shows the expected mode/status.
- Test desktop notifications and tray/background behavior.

## Release Safety

- Run `npm run check:unused`.
- Run `npm run check:ts-unused`.
- Run `npm audit --audit-level=moderate`.
- Run `npm run build`.
- Run `npm run desktop:build` before publishing a desktop installer.
- Scan docs and source for private domains, API keys, tokens, passwords, and service-role keys.
