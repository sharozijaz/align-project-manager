import type { ProjectInput, ProjectMilestoneInput } from "../types/project";
import type { HubNote, HubPalette } from "../types/studio";
import type { TaskInput } from "../types/task";

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  project: ProjectInput;
  milestones: Array<Omit<ProjectMilestoneInput, "projectId">>;
  tasks: Array<Omit<TaskInput, "projectId"> & { milestoneTitle?: string; linkedDocTitle?: string }>;
  docs: Array<Omit<HubNote, "id" | "createdAt" | "updatedAt" | "projectIds" | "relatedNoteIds"> & { relatedTitles?: string[]; milestoneTitle?: string }>;
  palette?: Omit<HubPalette, "id" | "createdAt" | "updatedAt" | "projectIds" | "noteIds"> & { noteTitles?: string[] };
}

const commonTask = {
  description: "",
  category: "project" as const,
  priority: "medium" as const,
  status: "not_started" as const,
  startDate: "",
  startTime: "",
  dueDate: "",
  dueTime: "",
  reminder: "none" as const,
  recurrence: "none" as const,
};

export const projectTemplates: ProjectTemplate[] = [
  {
    id: "web-design",
    name: "Web Design Project",
    description: "A full client website workflow from brief to launch.",
    project: {
      name: "New Website Project",
      description: "Client website design and build.",
      area: "business",
      status: "active",
      priority: "medium",
      mood: "client",
      icon: "WD",
      accentColor: "#3b82f6",
      coverImage: "align-gradient-mist",
      notes: [],
    },
    milestones: [
      { title: "Discovery", status: "active", sortOrder: 0 },
      { title: "Design", status: "planned", sortOrder: 1 },
      { title: "Build", status: "planned", sortOrder: 2 },
      { title: "Launch", status: "planned", sortOrder: 3 },
    ],
    tasks: [
      { ...commonTask, title: "Collect client brief", milestoneTitle: "Discovery", linkedDocTitle: "Project Brief" },
      { ...commonTask, title: "Prepare sitemap and page list", milestoneTitle: "Discovery" },
      { ...commonTask, title: "Design homepage direction", milestoneTitle: "Design", linkedDocTitle: "Design Direction" },
      { ...commonTask, title: "Build core pages", milestoneTitle: "Build" },
      { ...commonTask, title: "QA and launch checklist", milestoneTitle: "Launch", linkedDocTitle: "Launch Checklist" },
    ],
    docs: [
      { title: "Project Brief", body: "# Project Brief\n\n## Goal\n\n## Audience\n\n## Scope\n\n## Success Criteria\n", docType: "brief", docStatus: "draft", favorite: true, clientVisible: false },
      { title: "Design Direction", body: "# Design Direction\n\n## Visual Direction\n\n## References\n\n## Decisions\n", docType: "strategy", docStatus: "draft", clientVisible: false },
      { title: "Launch Checklist", body: "# Launch Checklist\n\n- [ ] Check responsive pages\n- [ ] Test forms\n- [ ] Confirm analytics\n- [ ] Prepare handoff notes\n", docType: "checklist", docStatus: "active", clientVisible: false },
    ],
    palette: {
      name: "Website Starter Palette",
      tags: "web, brand",
      noteTitles: ["Design Direction"],
      colors: [
        { id: "primary", name: "Primary", hex: "#1C1C1C", role: "Base" },
        { id: "foreground", name: "Text", hex: "#E5E5E5", role: "Foreground" },
        { id: "muted", name: "Subtle", hex: "#A1A1A1", role: "Muted" },
      ],
    },
  },
  {
    id: "ppc-landing-page",
    name: "PPC Landing Page",
    description: "Fast campaign page planning, copy, build, and handoff.",
    project: { name: "PPC Landing Page", description: "Campaign landing page from copy angle to launch.", area: "business", status: "active", priority: "high", mood: "focused", icon: "LP", accentColor: "#10a37f", coverImage: "align-gradient-emerald", notes: [] },
    milestones: [{ title: "Offer", status: "active", sortOrder: 0 }, { title: "Page Build", status: "planned", sortOrder: 1 }, { title: "Launch", status: "planned", sortOrder: 2 }],
    tasks: [
      { ...commonTask, title: "Define campaign offer", priority: "high", milestoneTitle: "Offer", linkedDocTitle: "Campaign Strategy" },
      { ...commonTask, title: "Draft page sections", milestoneTitle: "Offer" },
      { ...commonTask, title: "Build landing page", milestoneTitle: "Page Build" },
      { ...commonTask, title: "Connect tracking and form", milestoneTitle: "Launch" },
    ],
    docs: [{ title: "Campaign Strategy", body: "# Campaign Strategy\n\n## Offer\n\n## Audience\n\n## Promise\n\n## Page Sections\n", docType: "strategy", docStatus: "draft", favorite: true, clientVisible: false }],
  },
  {
    id: "brand-palette",
    name: "Brand/Palette Project",
    description: "A focused color and visual system exploration.",
    project: { name: "Brand Palette", description: "Palette, visual direction, and reusable brand notes.", area: "business", status: "active", priority: "medium", mood: "creative", icon: "BP", accentColor: "#8b5cf6", coverImage: "align-gradient-violet", notes: [] },
    milestones: [{ title: "Explore", status: "active", sortOrder: 0 }, { title: "Refine", status: "planned", sortOrder: 1 }],
    tasks: [{ ...commonTask, title: "Collect references", milestoneTitle: "Explore" }, { ...commonTask, title: "Create first palette", milestoneTitle: "Explore", linkedDocTitle: "Palette Notes" }, { ...commonTask, title: "Finalize color roles", milestoneTitle: "Refine" }],
    docs: [{ title: "Palette Notes", body: "# Palette Notes\n\n```align-palette\nBrand Palette\nPrimary | #1C1C1C | Base\nText | #E5E5E5 | Foreground\nSubtle | #A1A1A1 | Muted\n```\n", docType: "palette", docStatus: "active", favorite: true, clientVisible: false }],
    palette: { name: "Brand Palette", tags: "brand", noteTitles: ["Palette Notes"], colors: [{ id: "primary", name: "Primary", hex: "#1C1C1C", role: "Base" }, { id: "text", name: "Text", hex: "#E5E5E5", role: "Foreground" }, { id: "subtle", name: "Subtle", hex: "#A1A1A1", role: "Muted" }] },
  },
  {
    id: "seo-project",
    name: "SEO Project",
    description: "Research, fixes, content tasks, and reporting.",
    project: { name: "SEO Improvement Project", description: "SEO research, technical fixes, and content planning.", area: "business", status: "active", priority: "medium", mood: "technical", icon: "SEO", accentColor: "#f59e0b", coverImage: "align-gradient-amber", notes: [] },
    milestones: [{ title: "Audit", status: "active", sortOrder: 0 }, { title: "Fixes", status: "planned", sortOrder: 1 }, { title: "Content", status: "planned", sortOrder: 2 }],
    tasks: [{ ...commonTask, title: "Run SEO audit", milestoneTitle: "Audit", linkedDocTitle: "SEO Research" }, { ...commonTask, title: "Prioritize technical fixes", milestoneTitle: "Fixes" }, { ...commonTask, title: "Plan content updates", milestoneTitle: "Content" }],
    docs: [{ title: "SEO Research", body: "# SEO Research\n\n## Findings\n\n## Technical Issues\n\n## Content Opportunities\n\n## Decisions\n", docType: "research", docStatus: "draft", clientVisible: false }],
  },
  {
    id: "client-handoff",
    name: "Client Handoff",
    description: "A wrap-up project for delivery notes and next steps.",
    project: { name: "Client Handoff", description: "Client-safe handoff notes, completed work, and next steps.", area: "business", status: "active", priority: "medium", mood: "client", icon: "CH", accentColor: "#ef476f", coverImage: "align-gradient-mist", notes: [] },
    milestones: [{ title: "Package", status: "active", sortOrder: 0 }, { title: "Review", status: "planned", sortOrder: 1 }],
    tasks: [{ ...commonTask, title: "Write handoff summary", milestoneTitle: "Package", linkedDocTitle: "Client Handoff Notes" }, { ...commonTask, title: "Confirm access and next steps", milestoneTitle: "Review" }],
    docs: [{ title: "Client Handoff Notes", body: "# Client Handoff Notes\n\n## Completed Work\n\n## Access\n\n## Next Steps\n\n## Support Notes\n", docType: "reference", docStatus: "review", clientVisible: true, favorite: true }],
  },
  {
    id: "personal-website",
    name: "Personal Website Revamp",
    description: "Personal site redesign with strategy, docs, and build tasks.",
    project: { name: "Personal Website Revamp", description: "Personal website strategy, design, and rebuild.", area: "personal", status: "active", priority: "medium", mood: "personal", icon: "PW", accentColor: "#3b82f6", coverImage: "align-gradient-emerald", notes: [] },
    milestones: [{ title: "Strategy", status: "active", sortOrder: 0 }, { title: "Design", status: "planned", sortOrder: 1 }, { title: "Build", status: "planned", sortOrder: 2 }],
    tasks: [{ ...commonTask, title: "Clarify positioning", milestoneTitle: "Strategy", linkedDocTitle: "Personal Website Strategy" }, { ...commonTask, title: "Update portfolio projects", milestoneTitle: "Design" }, { ...commonTask, title: "Build and publish", milestoneTitle: "Build" }],
    docs: [{ title: "Personal Website Strategy", body: "# Personal Website Strategy\n\n## Goal\n\n## Audience\n\n## Pages\n\n## Voice\n", docType: "strategy", docStatus: "draft", favorite: true, clientVisible: false }],
  },
];
