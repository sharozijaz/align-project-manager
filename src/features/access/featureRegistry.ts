import {
  BarChart3,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  LibraryBig,
  Shield,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const featureKeys = [
  "project_management",
  "resource_vault",
  "prompt_library",
  "client_pipeline",
  "documents",
  "personal_hub",
  "admin",
] as const;

export type FeatureKey = (typeof featureKeys)[number];
export type AppRole = "owner" | "member" | "client";

export interface FeatureDefinition {
  key: FeatureKey;
  label: string;
  description: string;
  icon: LucideIcon;
  planned: boolean;
}

export const featureRegistry: FeatureDefinition[] = [
  {
    key: "project_management",
    label: "Project Management",
    description: "Dashboard, projects, tasks, calendar, reports, client links, and reminders.",
    icon: FolderKanban,
    planned: false,
  },
  {
    key: "resource_vault",
    label: "Resource Vault",
    description: "Saved inspiration, tools, links, references, and reusable resources.",
    icon: LibraryBig,
    planned: true,
  },
  {
    key: "prompt_library",
    label: "Prompt Library",
    description: "Reusable prompts for websites, copy, mockups, brands, and AI workflows.",
    icon: Sparkles,
    planned: true,
  },
  {
    key: "client_pipeline",
    label: "Client Pipeline",
    description: "Lead tracking, proposals, deposits, feedback, and client follow-ups.",
    icon: BriefcaseBusiness,
    planned: true,
  },
  {
    key: "documents",
    label: "Documents",
    description: "Future proposals, invoices, contracts, handoff docs, and generated PDFs.",
    icon: FileText,
    planned: true,
  },
  {
    key: "personal_hub",
    label: "Personal Hub",
    description: "Owner-only command center for private tools and personal workspace modules.",
    icon: BarChart3,
    planned: false,
  },
  {
    key: "admin",
    label: "Admin",
    description: "Manage invited users, roles, and feature access.",
    icon: Shield,
    planned: false,
  },
];

export const featureLabels = Object.fromEntries(featureRegistry.map((feature) => [feature.key, feature.label])) as Record<
  FeatureKey,
  string
>;

export const baseMemberFeatures: FeatureKey[] = ["project_management"];
export const ownerFeatures: FeatureKey[] = [...featureKeys];

export const isFeatureKey = (value: string): value is FeatureKey => featureKeys.includes(value as FeatureKey);
