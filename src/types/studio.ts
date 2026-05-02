export type ResourceCategory = "inspiration" | "icons" | "fonts" | "tools" | "wordpress" | "learning" | "other";
export type PipelineStage = "lead" | "proposal" | "active" | "waiting" | "won" | "lost";
export type StudioDocumentType = "invoice" | "contract" | "proposal" | "handoff" | "brief" | "other";
export type StudioDocumentStatus = "draft" | "sent" | "signed" | "paid" | "archived";
export type PersonalArea = "today" | "ideas" | "finance" | "learning" | "life" | "other";

export interface StudioBaseItem {
  id: string;
  title: string;
  notes?: string;
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceItem extends StudioBaseItem {
  category: ResourceCategory;
  tags?: string;
}

export interface PromptItem extends StudioBaseItem {
  useCase: string;
  content: string;
  tags?: string;
}

export interface PipelineItem extends StudioBaseItem {
  clientName: string;
  stage: PipelineStage;
  value?: string;
  nextStep?: string;
}

export interface StudioDocumentItem extends StudioBaseItem {
  clientName?: string;
  type: StudioDocumentType;
  status: StudioDocumentStatus;
}

export interface PersonalHubItem extends StudioBaseItem {
  area: PersonalArea;
}
