# Google Sign-In Setup

Align supports Supabase Google OAuth as a smoother sign-in option alongside magic links.

## What This Does

- Adds a `Continue with Google` button on the private sign-in screen.
- Google authenticates the user through Supabase Auth.
- Align still checks the signed-in email against your approved users and feature access.
- Google Calendar sync remains separate. A user can sign in with Google without connecting Calendar.

## Supabase Setup

1. Open Supabase Dashboard.
2. Go to **Authentication > Providers > Google**.
3. Enable Google.
4. Add your Google OAuth Client ID and Client Secret.
5. In Google Cloud, add this Authorized redirect URI:

```text
https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
```

For the current project, that should be:

```text
https://ydzfefrgawzqqpedkweq.supabase.co/auth/v1/callback
```

## Supabase URL Settings

In **Authentication > URL Configuration**:

- Site URL:

```text
https://align.sharoz.dev
```

- Redirect URLs:

```text
https://align.sharoz.dev/**
http://localhost:5173/**
```

## Access Rules

Google sign-in does not make the app public. The email still needs to be allowed.

For your account:

```sql
insert into public.allowed_users (email)
values ('sharozijaz4@gmail.com')
on conflict (email) do nothing;
```

If using the Admin page, make sure the same email exists as an active owner/member profile.

## Notes

- Keep magic link enabled as a fallback.
- Do not expose Google client secrets in frontend env vars.
- The Google Auth provider secret belongs in Supabase, not Vercel.
- Calendar OAuth uses its own Google credentials and redirect flow. It does not need to be merged with sign-in yet.
