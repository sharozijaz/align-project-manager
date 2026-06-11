export type HubResourceType = "inspiration" | "tools" | "assets" | "learning" | "snippets";
export type HubView = "resources" | "notes";
export type HubNoteDocType = "brief" | "strategy" | "research" | "palette" | "meeting" | "prompt" | "checklist" | "reference" | "general";
export type HubNoteDocStatus = "draft" | "active" | "review" | "archived";
export type HubSnippetType = "prompt" | "checklist" | "brief-section" | "palette-note" | "general";

export interface HubResource {
  id: string;
  title: string;
  url?: string;
  type: HubResourceType;
  collection?: string;
  tags?: string;
  notes?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HubNote {
  id: string;
  title: string;
  body: string;
  collection?: string;
  tags?: string;
  favorite?: boolean;
  clientVisible?: boolean;
  docType?: HubNoteDocType;
  docStatus?: HubNoteDocStatus;
  milestoneId?: string;
  projectIds: string[];
  relatedNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HubNoteSpace {
  id: string;
  name: string;
  description?: string;
  projectIds: string[];
  manualNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HubPaletteColor {
  id: string;
  name: string;
  hex: string;
  role?: string;
}

export interface HubPalette {
  id: string;
  name: string;
  projectIds: string[];
  noteIds: string[];
  colors: HubPaletteColor[];
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HubSnippet {
  id: string;
  title: string;
  type: HubSnippetType;
  body: string;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}
