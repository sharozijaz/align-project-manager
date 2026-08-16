# Align Workflow Templates

Align templates are importable workspace packs for repeatable project and planning workflows. They are meant to help web designers and developers start faster without turning Align into a paid-gated app.

## Template Model

- The open-source app stays free and fully usable.
- Free samples can live in this repository.
- Paid packs should be sold separately from the source repository.
- Template packs use Align's existing full workspace backup format.
- Importing a template currently replaces the local workspace after saving a safety copy.

Because import is a workspace restore flow, always export a full backup before importing a template into a real workspace.

## Free Sample Pack

The first free sample is:

```text
templates/free-figma-to-wordpress-starter/
```

It includes:

- a sample website redesign project
- parent tasks and subtasks for Figma-to-WordPress work
- planning calendar events
- project notes for brief, access, handoff, and QA
- a reusable discovery note
- a small resource list

## Optional Paid Packs

Examples of optional packs that could be distributed outside this repository:

- `Web Designer Starter Pack`
- `Figma to WordPress Project Pack`
- `Client Feedback + Revision Pack`
- `Website Care Plan Pack`
- `Freelance Weekly Planning Pack`

Each paid pack should include:

- an importable Align JSON file
- a short Markdown guide
- example projects, tasks, subtasks, notes, and planning structure
- optional client handoff notes and checklists
- a changelog for pack updates

## How To Import A Template

1. Open Align.
2. Go to Settings > Data.
3. Click **Export Full Backup** and keep that file somewhere safe.
4. Click **Import Backup**.
5. Choose the template JSON file.
6. Confirm the import.
7. Rename the sample project and dates for your real client.

The import flow saves a local safety copy first, but a manual backup is still recommended before importing into an important workspace.

## Creating New Packs

Use fake, generic client names only. Never include real client data, private links, credentials, API keys, passwords, tokens, or paid customer content.

Recommended structure:

```text
templates/pack-name/
  README.md
  align-template.json
```

For paid packs, keep the finished JSON outside the public repository. Only publish free samples here.

## Template Quality Bar

A useful Align template should:

- solve one specific workflow
- include realistic task hierarchy
- include notes that explain the workflow
- avoid excessive demo clutter
- work in local-only mode
- require no Supabase, Google, email, or hosted setup
- import cleanly through Settings > Data > Import Backup
