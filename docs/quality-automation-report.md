# Quality Automation Report

Last updated: 2026-06-03

## Implemented

- Replaced the old top-bar inline search dropdown with a single global command/search palette.
- Added keyboard access with `Ctrl+K`, arrow navigation, `Enter` to open, and `Esc` to close.
- Search now indexes routes, projects, project tasks, personal todos, notes, resources, and calendar events from existing local stores.
- Added testable project progress logic and connected it to dashboard project cards.
- Added testable notification presentation helpers for unread/read grouping and project/personal task context.
- Added automated unit coverage for:
  - universal search routing and result categories
  - project task completion/progress calculations
  - notification grouping and task/project labels
  - drag preview positioning and viewport clamping
  - external share URL protocol safety

## Verification

- `npm test`: passed, 5 files and 11 tests.
- `npm run check:release`: passed.
- `npm run desktop:build`: passed.
- Built desktop artifacts:
  - `src-tauri/target/release/bundle/msi/Align_0.3.0_x64_en-US.msi`
  - `src-tauri/target/release/bundle/nsis/Align_0.3.0_x64-setup.exe`

## Desktop QA Notes

- The built `align.exe` was launched for a smoke check.
- A pre-existing Align desktop process was already running, so the fresh launch returned exit code `0` and handed off to the existing instance.
- Authenticated hands-on visual QA could not be completed in the in-app browser because the app correctly stops at the sign-in gate without a real session.

## Remaining QA

- Run a signed-in visual pass in the installed desktop app:
  - open command palette from the top search box and with `Ctrl+K`
  - search for a project, task, todo, note, resource, and route
  - verify navigation after pressing `Enter`
  - verify notifications panel layering and actions
  - verify drag/drop in Projects, task lists, and Kanban views
  - verify client sharing modal opens and links still work
