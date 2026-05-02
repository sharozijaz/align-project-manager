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
  tags?: string;
  favorite?: boolean;
  createdAt: string;
  updatedAt: string;
}
