import type { CalendarEvent } from "../types/calendar";
import type { Project, ProjectMilestone } from "../types/project";
import type { HubNote, HubPalette } from "../types/studio";
import type { Task } from "../types/task";

export function buildSampleWorkspace() {
  const now = new Date().toISOString();
  const projectId = crypto.randomUUID();
  const discoveryId = crypto.randomUUID();
  const buildId = crypto.randomUUID();
  const briefId = crypto.randomUUID();
  const paletteId = crypto.randomUUID();

  const project: Project = {
    id: projectId,
    name: "Sample Website Redesign",
    description: "A local sample freelancer project with docs, tasks, palette, milestones, and handoff context.",
    area: "business",
    status: "active",
    priority: "medium",
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
    pinnedAt: now,
    notes: [],
    createdAt: now,
    updatedAt: now,
  };

  const milestones: ProjectMilestone[] = [
    { id: discoveryId, projectId, title: "Discovery", status: "done", sortOrder: 0, createdAt: now, updatedAt: now },
    { id: buildId, projectId, title: "Build and Handoff", status: "active", sortOrder: 1, createdAt: now, updatedAt: now },
  ];

  const tasks: Task[] = [
    sampleTask("Audit existing homepage", projectId, discoveryId, "done", briefId),
    sampleTask("Create landing page wireframe", projectId, buildId, "in_progress", briefId),
    sampleTask("Prepare client handoff checklist", projectId, buildId, "not_started", briefId),
  ];

  const notes: HubNote[] = [
    {
      id: briefId,
      title: "Sample Website Brief",
      body: "# Sample Website Brief\n\n## Goal\n\nRefresh the homepage so visitors understand the offer quickly.\n\n## Decisions\n\n- Keep copy direct and client-facing.\n- Use the linked palette for the first visual pass.\n\n## Next Steps\n\n- [ ] Finalize wireframe\n- [ ] Review handoff checklist\n",
      tags: "sample, brief, handoff",
      favorite: true,
      clientVisible: true,
      docType: "brief",
      docStatus: "active",
      projectIds: [projectId],
      relatedNoteIds: [],
      milestoneId: discoveryId,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const palettes: HubPalette[] = [
    {
      id: paletteId,
      name: "Sample Website Palette",
      projectIds: [projectId],
      noteIds: [briefId],
      colors: [
        { id: "sample-primary", name: "Ink", hex: "#1C1C1C", role: "Base" },
        { id: "sample-surface", name: "Paper", hex: "#F3F4F6", role: "Surface" },
        { id: "sample-accent", name: "Action", hex: "#2563EB", role: "Accent" },
      ],
      tags: "sample, brand",
      createdAt: now,
      updatedAt: now,
    },
  ];

  const events: CalendarEvent[] = [
    {
      id: crypto.randomUUID(),
      title: "Sample client review",
      description: "Review homepage direction and next steps.",
      startDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString().slice(0, 10),
      source: "local",
    },
  ];

  return { projects: [project], tasks, notes, palettes, milestones, events };
}

function sampleTask(title: string, projectId: string, milestoneId: string, status: Task["status"], linkedNoteId: string): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title,
    description: "",
    projectId,
    category: "project",
    priority: "medium",
    status,
    startDate: "",
    startTime: "",
    dueDate: "",
    dueTime: "",
    reminder: "none",
    recurrence: "none",
    linkedNoteIds: [linkedNoteId],
    milestoneId,
    createdAt: now,
    updatedAt: now,
  };
}
