# Align Security

## Current Protection

- The app is hidden behind an auth gate when Supabase is configured.
- `VITE_ALLOWED_EMAILS` blocks non-allowed emails in the UI.
- Supabase Row Level Security protects cloud data per signed-in user.

## Production Hardening

Frontend environment variables are visible in browser builds, so `VITE_ALLOWED_EMAILS` is only a UX guard. Use database-level allowlisting for real enforcement.

Run:

```text
supabase/security-hardening.sql
```

Then, in the same Supabase SQL Editor run or immediately after, add your own email:

```sql
insert into public.allowed_users (email)
values ('your-email@example.com')
on conflict (email) do nothing;
```

If you run the hardening SQL without adding your email, the app will correctly block cloud reads and writes until an allowed user is inserted.

This creates:

- `public.allowed_users`
- `public.is_allowed_user()`
- RLS policies that require both:
  - the row belongs to the signed-in user
  - the signed-in email exists in `allowed_users`

## Adding Another User

In Supabase SQL Editor:

```sql
insert into public.allowed_users (email)
values ('teammate@example.com')
on conflict (email) do nothing;
```

Also add the email to `VITE_ALLOWED_EMAILS` in Vercel if you want the UI gate to allow it before redeploy.

## Removing Access

```sql
delete from public.allowed_users
where lower(email) = lower('teammate@example.com');
```

Then revoke or expire their session from Supabase Auth if immediate removal is required.
