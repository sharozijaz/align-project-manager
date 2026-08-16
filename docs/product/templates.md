# Align Workflow Templates

Align templates are importable workspace packs for repeatable project and planning workflows. They help designers, developers, freelancers, and small teams start from a useful structure instead of a blank workspace.

## Template Model

- Templates are optional.
- The app remains fully usable without templates.
- Public templates should contain only fake, generic sample data.
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

## Template Ideas

Useful template ideas:

- `Web Designer Starter Pack`
- `Figma to WordPress Project Pack`
- `Client Feedback + Revision Pack`
- `Website Care Plan Pack`
- `Freelance Weekly Planning Pack`

Each template should include:

- an importable Align JSON file
- a short Markdown guide
- example projects, tasks, subtasks, notes, and planning structure
- optional client handoff notes and checklists
- notes that explain how to adapt the workflow

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

Use fake, generic client names only. Never include real client data, private links, credentials, API keys, passwords, tokens, or customer content.

Recommended structure:

```text
templates/pack-name/
  README.md
  align-template.json
```

Only publish templates that are safe for public use.

## Template Quality Bar

A useful Align template should:

- solve one specific workflow
- include realistic task hierarchy
- include notes that explain the workflow
- avoid excessive demo clutter
- work in local-only mode
- require no Supabase, Google, email, or hosted setup
- import cleanly through Settings > Data > Import Backup
