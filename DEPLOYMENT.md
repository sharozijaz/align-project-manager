# Align Deployment

## Recommended Host

Use Vercel, Netlify, or Cloudflare Pages. The app is a Vite static app.

## Build Settings

- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Environment Variables

Add these in the hosting provider dashboard:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ALLOWED_EMAILS=you@example.com
VITE_APP_URL=https://your-deployed-url
```

Use the same values that are currently working in `.env.local`.

`VITE_APP_URL` must be the full app URL with `https://`. Do not use the Supabase project URL here.

## Supabase Auth Redirect URLs

After deployment, copy the deployed URL and add it in Supabase:

Supabase Dashboard > Authentication > URL Configuration

Set:

```text
Site URL: https://your-deployed-url
```

Add redirect URLs:

```text
http://localhost:5173/
https://your-deployed-url/
```

When the custom subdomain is ready, add:

```text
https://your-subdomain.yourdomain.com/
```

Magic links are generated against the app root URL. If you change these Supabase settings, request a fresh magic link because old links keep their original redirect target.

## First Production Test

1. Deploy the app.
2. Open the deployed URL.
3. Go to Settings.
4. Sign in with magic link.
5. Confirm sync status becomes `synced`.
6. Add a task.
7. Refresh or open another browser.
8. Confirm the task auto-downloads after sign-in.

## Notes

- `vercel.json` handles React Router refreshes on Vercel.
- `public/_redirects` handles React Router refreshes on Netlify.
- The app still keeps LocalStorage as an offline/local fallback.
