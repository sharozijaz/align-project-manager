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

## Background Running and Reminders

Align hides to the Windows system tray when you click the window close button. This keeps the app process alive, so in-app desktop reminder checks can continue while Align is tucked away.

- Click the Align tray icon to show the app again.
- Use the tray menu item **Show Align** to restore it.
- Use the tray menu item **Hide to tray** to tuck it away without quitting.
- Use the tray menu item **Quit Align** when you want to fully close the app.
- Opening Align again while it is already running focuses the existing window.

Settings also includes **Start with Windows**. When enabled, Align registers itself with the operating system and launches with the `--background` flag after login. The desktop window starts hidden to tray, so reminder checks can run after Windows starts without manually opening Align.

Reminder model:

- Works while Align is open.
- Works while Align is hidden to tray.
- Works after login when **Start with Windows** is enabled and Windows starts Align in the tray.
- Does not work while the computer is off, asleep, or Align has been fully quit from the tray menu.

For fully closed/offline delivery, keep server/email reminders enabled. A true always-on reminder system would require a separate Windows service or server-side scheduled reminders, which is intentionally outside this desktop shell.

## Reinstall and Update

Align Desktop is a client shell for the same Supabase-backed workspace.

1. Download or build the latest installer.
2. Quit Align from the tray menu if it is running.
3. Run the new NSIS `.exe` installer over the existing install.
4. Open Align and sign in with the same Supabase account.
5. Confirm Settings > Supabase Sync shows the workspace as synced.

Your tasks, projects, resources, notes, share links, and preferences should come back through Supabase sync. Manual JSON restore is only needed if cloud sync was disabled or the workspace was never uploaded.

For future app changes:

```bash
git pull origin main
npm install
npm run build
npm run desktop:build
```

Then run the new installer from `src-tauri/target/release/bundle/`.

## Ubuntu GNOME Build

Tauri Linux builds must be built on Linux. On Ubuntu GNOME, install the Tauri v2 Linux dependencies, Rust, and Node.js.

```bash
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libxdo-dev \
  libssl-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

Install Rust:

```bash
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
source "$HOME/.cargo/env"
rustup default stable
```

Install Node.js LTS, then build:

```bash
git clone https://github.com/sharozijaz/align-project-manager.git
cd align-project-manager
npm install
cp .env.example .env.local
# Fill .env.local with the same public VITE_* values used for the desktop build.
npm run build
npm run desktop:build
```

Linux bundles are written under:

```text
src-tauri/target/release/bundle/
```

Depending on installed Linux packaging tools, expect `.deb`, `.AppImage`, or related package folders.

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
