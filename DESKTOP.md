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

The Windows installer output is created under `src-tauri/target/release/bundle/`:

```text
src-tauri/target/release/bundle/nsis/Align_0.2.0_x64-setup.exe
src-tauri/target/release/bundle/msi/Align_0.2.0_x64_en-US.msi
```

Use the NSIS `.exe` installer for the easiest local install.

For normal Align updates, run the newer NSIS installer over the current install. You should not need to uninstall first as long as the app identifier stays the same.

## Background Running

Align hides to the Windows system tray when you click the window close button. This keeps the app process alive, so in-app desktop reminder checks can continue while Align is tucked away.

- Click the Align tray icon to show the app again.
- Use the tray menu item **Show Align** to restore it.
- Use the tray menu item **Quit Align** when you want to fully close the app.
- Opening Align again while it is already running focuses the existing window.

Reliable reminders while the computer is off, asleep, or Align is fully quit should still use server/email reminders.

## Future Auto Updates

True in-app auto-update is a separate production step. It needs:

- Tauri updater plugin.
- A signing key pair, with the private key stored only in CI or deployment secrets.
- A release endpoint, such as GitHub Releases or a Vercel-hosted updater JSON file.
- A small Settings action like **Check for Updates** once the updater is wired.

Until then, the practical update flow is to build a new installer and run it over the old install.

## Auth Redirects

Supabase Auth must allow the Tauri desktop redirect origin. In Supabase, open Authentication > URL Configuration and add:

```text
align://auth/callback
http://tauri.localhost/**
http://localhost:5173/**
https://align.sharoz.dev/**
```

The desktop Google button opens your system browser and returns to Align through the `align://auth/callback` deep link.

Google sign-in still uses the Supabase OAuth callback URL in Google Cloud:

```text
https://ydzfefrgawzqqpedkweq.supabase.co/auth/v1/callback
```

Google Calendar sync remains separate from sign-in and still uses the deployed Vercel API callback.

## Notes

- The desktop app is intentionally a wrapper around the existing cloud app logic.
- Data stays in Supabase, with LocalStorage remaining as the offline fallback.
- Desktop notifications mirror the in-app reminder bell while Align is open or hidden to tray. Reliable reminders while Align is fully quit should still stay server/email based.
