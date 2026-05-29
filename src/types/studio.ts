export type HubResourceType = "inspiration" | "tools" | "assets" | "learning" | "snippets";
export type HubView = "resources" | "notes";

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
