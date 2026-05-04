# Align Desktop

Align now has a Tauri desktop scaffold. The desktop app uses the same React/Vite frontend and keeps Supabase, Google sign-in, Google Calendar sync, reminders, and cloud data as the source of truth.

## One-Time Setup

Install the Tauri system prerequisites on Windows:

1. Install Rust from https://rustup.rs.
2. Install Microsoft C++ Build Tools with the MSVC and Windows SDK components from https://aka.ms/vs/17/release/vs_BuildTools.exe.
3. Restart PowerShell after installing Rust and the build tools.
4. Confirm Rust is available:

```bash
cargo --version
rustc --version
```

Windows WebView2 is also required. It is usually already installed on Windows 11.

## Run Desktop Dev

```bash
npm install
npm run desktop:dev
```

This starts Vite and opens the Tauri desktop shell.

## Build Installer

```bash
npm run desktop:build
```

The Windows installer output will be created under `src-tauri/target/release/bundle/`.

## Auth Redirects

Supabase Auth must allow the Tauri desktop redirect origin. In Supabase, open Authentication > URL Configuration and add:

```text
https://tauri.localhost/**
http://localhost:5173/**
https://align.sharoz.dev/**
```

Google sign-in still uses the Supabase OAuth callback URL in Google Cloud:

```text
https://ydzfefrgawzqqpedkweq.supabase.co/auth/v1/callback
```

Google Calendar sync remains separate from sign-in and still uses the deployed Vercel API callback.

## Notes

- The desktop app is intentionally a wrapper around the existing cloud app logic.
- Data stays in Supabase, with LocalStorage remaining as the offline fallback.
- Desktop notifications can be added later with a Tauri notification plugin, but reliable reminders while the app is closed should still stay server/email based.
