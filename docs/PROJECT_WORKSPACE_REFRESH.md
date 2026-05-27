# Project Workspace Refresh

This plan tracks the collaboration and project workspace redesign.

## Goal

Make project work feel like a focused workspace instead of a stack of forms. Collaboration remains project-scoped: invited editors can work inside shared projects, while private workspace data stays hidden.

## Phases

### Phase 1 - Collaboration Fixes

- Shared projects use the same task views as owner projects.
- Collaborators can add, edit, delete, reorder, and update shared project tasks.
- Collaborators can leave work unassigned or assign tasks to themselves from the assignee selector.
- Shared task mutations show saving feedback and refetch on rejected Supabase updates instead of silently reverting.
- Collaborators can use List, Table, Board, Kanban, and Notes views.
- Team-visible notes open in the normal note reader modal.
- Private projects, Resources, private Notes, Settings, Admin, client share controls, and collaborator management remain blocked.

### Phase 2 - Owner Project Page Redesign

- Project header stays compact with progress, dates, and pin state.
- Quick-add is moved into an Add Task modal.
- Search, filters, Customize, Add Task, and view tabs live in one toolbar.
- Project notes remain secondary context instead of competing with the main task board.

### Phase 3 - View Field Customization

- Project views can show or hide Assignee, Status, Priority, Start, Due, Notes, Subtasks, Project, and Actions.
- Preferences are saved locally per view.
- Assignee is visible in owner and collaborator task views.

### Phase 4 - Board And Kanban Refresh

- Board and Kanban reduce redundant controls.
- Kanban columns use status color accents and include inline `+ Add task` controls.
- Drag-and-drop remains available with clearer hover/drop feedback.

### Phase 5 - Dialog Cleanup

- Task creation and editing should progressively group core, ownership, workflow, timeline, and optional settings.
- Destructive actions should use Align custom confirm dialogs.
- Task rows and cards should stay light. Full editing moves into the task detail modal.
- Visible checkmark/delete controls are removed from main task surfaces; status controls completion, and overflow/detail menus handle destructive actions.

## Task Detail Direction

Project views are for scanning and moving work. Clicking a task opens a reusable task detail modal for deeper edits:

- Title and description.
- Project context.
- Assignee, status, and priority.
- Start and due dates.
- Subtasks with add/edit/delete/status.
- Linked or team-visible notes.
- Saving/activity placeholder for future history.

Owner and collaborator flows share this modal, with collaborator permissions scoped to shared project tasks only.

## Collaboration Scope

Collaboration is project-scoped editor access. It is not workspace access.

Collaborators can:

- View explicitly shared projects.
- Add, edit, delete, reorder, and update tasks/subtasks in those projects.
- See team-visible notes linked to those projects.
- Use shared project task views.

Collaborators cannot:

- See private projects or unshared work.
- See Resources or private Notes.
- Open Settings Data, Admin, Google sync, or client share controls.
- Delete projects or manage collaborators.

Client share links stay separate and read-only.

## Test Notes

- Owner invites a collaborator and assigns a task.
- Collaborator sees only the shared project.
- Collaborator can create, edit, delete, reorder, and update shared tasks.
- Collaborator can create an unassigned task and a task assigned to self.
- Repeated status and assignee changes persist after refresh.
- Owner and collaborator can open the same task detail modal and manage subtasks.
- Collaborator can open team-visible notes in a modal.
- Owner can see assignees in List, Table, Board, and Kanban.
- Field visibility preferences persist after refresh.
- Existing solo workflows, backups, Google sync, calendar planning, and client share links continue unchanged.
