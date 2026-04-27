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
```

Use the same values that are currently working in `.env.local`.

## Supabase Auth Redirect URLs

After deployment, copy the deployed URL and add it in Supabase:

Supabase Dashboard > Authentication > URL Configuration

Set:

```text
Site URL: https://your-deployed-url
```

Add redirect URLs:

```text
http://localhost:5173/settings
https://your-deployed-url/settings
```

When the custom subdomain is ready, add:

```text
https://your-subdomain.yourdomain.com/settings
```

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
